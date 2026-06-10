import db from "../config/db.js";
import createNotification from "../utils/notificationHelper.js";
import runProjectAiAnalysis from "../utils/runProjectAiAnalysis.js";

const getAllTasks = async (req, res) => {
  try {
    let query = `
      SELECT
        t.task_id,
        t.title,
        t.description,
        t.assigned_user,
        assigned.name AS assigned_user_name,
        assigned.email AS assigned_user_email,
        t.deadline,
        t.priority,
        t.status,
        t.project_id,
        p.name AS project_name,
        t.created_at
      FROM tasks t
      JOIN users assigned ON t.assigned_user = assigned.user_id
      JOIN projects p ON t.project_id = p.project_id
    `;

    const values = [];

    if (req.user.role === "employee") {
      query += " WHERE t.assigned_user = ?";
      values.push(req.user.user_id);
    }

    query += " ORDER BY t.created_at DESC";

    const [tasks] = await db.query(query, values);

    return res.json({
      message: "Tasks fetched successfully",
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    return res.status(500).json({
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const [tasks] = await db.query(
      `
      SELECT
        t.task_id,
        t.title,
        t.description,
        t.assigned_user,
        assigned.name AS assigned_user_name,
        assigned.email AS assigned_user_email,
        t.deadline,
        t.priority,
        t.status,
        t.project_id,
        p.name AS project_name,
        t.created_at
      FROM tasks t
      JOIN users assigned ON t.assigned_user = assigned.user_id
      JOIN projects p ON t.project_id = p.project_id
      WHERE t.task_id = ?
      `,
      [id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const task = tasks[0];

    if (
      req.user.role === "employee" &&
      Number(task.assigned_user) !== Number(req.user.user_id)
    ) {
      return res.status(403).json({
        message: "Access denied, this task is not assigned to you",
      });
    }

    return res.json({
      message: "Task fetched successfully",
      task,
    });
  } catch (error) {
    console.error("Get task by id error:", error);

    return res.status(500).json({
      message: "Failed to fetch task",
      error: error.message,
    });
  }
};

const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      assigned_user,
      assignedUser,
      deadline,
      priority,
      status,
      project_id,
      projectId,
    } = req.body;

    const finalAssignedUser = assigned_user || assignedUser;
    const finalProjectId = project_id || projectId;
    const finalPriority = priority || "medium";
    const finalStatus = status || "pending";

    if (!title || !description || !finalAssignedUser || !finalProjectId) {
      return res.status(400).json({
        message:
          "Title, description, assigned user, and project id are required.",
      });
    }

    const [projectRows] = await db.query(
      `
      SELECT project_id, name, status
      FROM projects
      WHERE project_id = ?
      `,
      [finalProjectId]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    const project = projectRows[0];

    if (project.status === "completed" || project.status === "cancelled") {
      return res.status(400).json({
        message: "Cannot assign tasks to completed or cancelled projects.",
      });
    }

    const [userRows] = await db.query(
      `
      SELECT user_id, name, email, role
      FROM users
      WHERE user_id = ?
      `,
      [finalAssignedUser]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        message: "Assigned user not found.",
      });
    }

    const assignedUserData = userRows[0];

    if (assignedUserData.role !== "employee") {
      return res.status(400).json({
        message: "Tasks can only be assigned to employees.",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO tasks (
        title,
        description,
        assigned_user,
        deadline,
        priority,
        status,
        project_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description,
        finalAssignedUser,
        deadline || null,
        finalPriority,
        finalStatus,
        finalProjectId,
      ]
    );

    const newTask = {
      task_id: result.insertId,
      title,
      description,
      assigned_user: finalAssignedUser,
      assigned_user_name: assignedUserData.name,
      assigned_user_email: assignedUserData.email,
      deadline: deadline || null,
      priority: finalPriority,
      status: finalStatus,
      project_id: finalProjectId,
      project_name: project.name,
    };

    const io = req.app.get("io");

    try {
      await createNotification({
        io,
        message: `You have been assigned a new task "${title}" in project "${project.name}".`,
        type: "task_assigned",
        alert_user: finalAssignedUser,
      });
    } catch (notificationError) {
      console.error("Task assigned notification error:", notificationError);
    }

    let aiAnalysis = null;

    try {
      aiAnalysis = await runProjectAiAnalysis({
        projectId: finalProjectId,
        io,
        notify: true,
      });
    } catch (aiError) {
      console.error("Auto AI analysis after task creation error:", aiError);
    }

    return res.status(201).json({
      message: "Task created successfully.",
      task: newTask,
      ai_analysis: aiAnalysis,
    });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      message: "Server error while creating task.",
      error: error.message,
    });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["pending", "in_progress", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid task status.",
      });
    }

    const [taskRows] = await db.query(
      `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.deadline,
        t.project_id,
        t.assigned_user,
        p.name AS project_name,
        p.created_by AS project_created_by
      FROM tasks t
      INNER JOIN projects p ON p.project_id = t.project_id
      WHERE t.task_id = ?
      `,
      [id]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    const task = taskRows[0];

    if (
      req.user.role === "employee" &&
      Number(task.assigned_user) !== Number(req.user.user_id)
    ) {
      return res.status(403).json({
        message: "You can only update tasks assigned to you.",
      });
    }

    await db.query(
      `
      UPDATE tasks
      SET status = ?
      WHERE task_id = ?
      `,
      [status, id]
    );

    const updatedTask = {
      ...task,
      status,
    };

    const io = req.app.get("io");

    const formattedStatus = String(status || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    try {
      if (
        task.project_created_by &&
        Number(task.project_created_by) !== Number(req.user.user_id)
      ) {
        await createNotification({
          io,
          message: `Task "${task.title}" in project "${task.project_name}" was updated to ${formattedStatus}.`,
          type: "task_status_updated",
          alert_user: task.project_created_by,
        });
      }
    } catch (notificationError) {
      console.error("Task status notification error:", notificationError);
    }

    let aiAnalysis = null;

    try {
      aiAnalysis = await runProjectAiAnalysis({
        projectId: task.project_id,
        io,
        notify: true,
      });
    } catch (aiError) {
      console.error("Auto AI analysis after task status update error:", aiError);
    }

    return res.json({
      message: "Task status updated successfully.",
      task: updatedTask,
      ai_analysis: aiAnalysis,
    });
  } catch (error) {
    console.error("Update task status error:", error);

    return res.status(500).json({
      message: "Server error while updating task status.",
      error: error.message,
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      assigned_user,
      assignedUser,
      deadline,
      priority,
      status,
      project_id,
      projectId,
    } = req.body;

    const finalAssignedUser = assigned_user || assignedUser;
    const finalProjectId = project_id || projectId;

    const [taskRows] = await db.query(
      `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.deadline,
        t.project_id,
        t.assigned_user,
        p.name AS project_name
      FROM tasks t
      INNER JOIN projects p ON p.project_id = t.project_id
      WHERE t.task_id = ?
      `,
      [id]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    const oldTask = taskRows[0];

    const newProjectId = finalProjectId || oldTask.project_id;
    const newAssignedUser = finalAssignedUser || oldTask.assigned_user;

    const [projectRows] = await db.query(
      `
      SELECT project_id, name, status
      FROM projects
      WHERE project_id = ?
      `,
      [newProjectId]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    const project = projectRows[0];

    if (project.status === "completed" || project.status === "cancelled") {
      return res.status(400).json({
        message: "Cannot assign tasks to completed or cancelled projects.",
      });
    }

    const [userRows] = await db.query(
      `
      SELECT user_id, name, email, role
      FROM users
      WHERE user_id = ?
      `,
      [newAssignedUser]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        message: "Assigned user not found.",
      });
    }

    if (userRows[0].role !== "employee") {
      return res.status(400).json({
        message: "Tasks can only be assigned to employees.",
      });
    }

    const updatedTitle = title ?? oldTask.title;
    const updatedDescription = description ?? oldTask.description;
    const updatedAssignedUser = newAssignedUser;
    const updatedDeadline =
      deadline !== undefined ? deadline || null : oldTask.deadline;
    const updatedPriority = priority ?? oldTask.priority;
    const updatedStatus = status ?? oldTask.status;
    const updatedProjectId = newProjectId;

    await db.query(
      `
      UPDATE tasks
      SET 
        title = ?,
        description = ?,
        assigned_user = ?,
        deadline = ?,
        priority = ?,
        status = ?,
        project_id = ?
      WHERE task_id = ?
      `,
      [
        updatedTitle,
        updatedDescription,
        updatedAssignedUser,
        updatedDeadline,
        updatedPriority,
        updatedStatus,
        updatedProjectId,
        id,
      ]
    );

    const [updatedRows] = await db.query(
      `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.deadline,
        t.project_id,
        t.assigned_user,
        u.name AS assigned_user_name,
        u.email AS assigned_user_email,
        p.name AS project_name
      FROM tasks t
      LEFT JOIN users u ON u.user_id = t.assigned_user
      INNER JOIN projects p ON p.project_id = t.project_id
      WHERE t.task_id = ?
      `,
      [id]
    );

    const updatedTask = updatedRows[0];

    const io = req.app.get("io");

    if (Number(oldTask.assigned_user) !== Number(updatedAssignedUser)) {
      try {
        await createNotification({
          io,
          message: `Task "${updatedTitle}" was assigned to you in project "${updatedTask.project_name}".`,
          type: "task_assigned",
          alert_user: updatedAssignedUser,
        });
      } catch (notificationError) {
        console.error("Task reassigned notification error:", notificationError);
      }
    }

    let aiAnalysis = null;

    try {
      aiAnalysis = await runProjectAiAnalysis({
        projectId: updatedProjectId,
        io,
        notify: true,
      });

      if (Number(oldTask.project_id) !== Number(updatedProjectId)) {
        await runProjectAiAnalysis({
          projectId: oldTask.project_id,
          io,
          notify: true,
        });
      }
    } catch (aiError) {
      console.error("Auto AI analysis after task update error:", aiError);
    }

    return res.json({
      message: "Task updated successfully.",
      task: updatedTask,
      ai_analysis: aiAnalysis,
    });
  } catch (error) {
    console.error("Update task error:", error);

    return res.status(500).json({
      message: "Server error while updating task.",
      error: error.message,
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const [taskRows] = await db.query(
      `
      SELECT 
        t.task_id,
        t.title,
        t.project_id,
        t.assigned_user,
        p.name AS project_name
      FROM tasks t
      INNER JOIN projects p ON p.project_id = t.project_id
      WHERE t.task_id = ?
      `,
      [id]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    const task = taskRows[0];

    await db.query(
      `
      DELETE FROM tasks
      WHERE task_id = ?
      `,
      [id]
    );

    const io = req.app.get("io");

    let aiAnalysis = null;

    try {
      aiAnalysis = await runProjectAiAnalysis({
        projectId: task.project_id,
        io,
        notify: true,
      });
    } catch (aiError) {
      console.error("Auto AI analysis after task delete error:", aiError);
    }

    return res.json({
      message: "Task deleted successfully.",
      deleted_task: {
        task_id: task.task_id,
        title: task.title,
        project_id: task.project_id,
        project_name: task.project_name,
      },
      ai_analysis: aiAnalysis,
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      message: "Server error while deleting task.",
      error: error.message,
    });
  }
};

export {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};