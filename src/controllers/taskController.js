import db from "../config/db.js";

const getAllTasks = async (req, res) => {
  try {
    let query = `
      SELECT
        t.task_id,
        t.title,
        t.description,
        t.assigned_user,
        assigned.name AS assigned_user_name,
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

    if (req.user.role === "employee" && task.assigned_user !== req.user.user_id) {
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
      deadline,
      priority,
      status,
      project_id,
    } = req.body;

    const [employees] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ? AND role = 'employee'",
      [assigned_user]
    );

    if (employees.length === 0) {
      return res.status(400).json({
        message: "Assigned user not found or user is not an employee",
      });
    }

    const [projects] = await db.query(
      "SELECT project_id FROM projects WHERE project_id = ?",
      [project_id]
    );

    if (projects.length === 0) {
      return res.status(400).json({
        message: "Project not found",
      });
    }

    const [result] = await db.query(
      `INSERT INTO tasks
       (title, description, assigned_user, deadline, priority, status, project_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        assigned_user,
        deadline || null,
        priority || "medium",
        status || "pending",
        project_id,
      ]
    );

    return res.status(201).json({
      message: "Task created successfully",
      task: {
        task_id: result.insertId,
        title,
        description: description || null,
        assigned_user,
        deadline: deadline || null,
        priority: priority || "medium",
        status: status || "pending",
        project_id,
      },
    });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      message: "Failed to create task",
      error: error.message,
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    const [tasks] = await db.query("SELECT * FROM tasks WHERE task_id = ?", [
      id,
    ]);

    if (tasks.length === 0) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const {
      title,
      description,
      assigned_user,
      deadline,
      priority,
      status,
      project_id,
    } = req.body;

    if (assigned_user !== undefined) {
      const [employees] = await db.query(
        "SELECT user_id FROM users WHERE user_id = ? AND role = 'employee'",
        [assigned_user]
      );

      if (employees.length === 0) {
        return res.status(400).json({
          message: "Assigned user not found or user is not an employee",
        });
      }
    }

    if (project_id !== undefined) {
      const [projects] = await db.query(
        "SELECT project_id FROM projects WHERE project_id = ?",
        [project_id]
      );

      if (projects.length === 0) {
        return res.status(400).json({
          message: "Project not found",
        });
      }
    }

    const updates = {};
    const values = [];

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (assigned_user !== undefined) updates.assigned_user = assigned_user;
    if (deadline !== undefined) updates.deadline = deadline;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;
    if (project_id !== undefined) updates.project_id = project_id;

    const updateFields = Object.keys(updates);

    if (updateFields.length === 0) {
      return res.status(400).json({
        message: "No fields provided for update",
      });
    }

    const setClause = updateFields.map((field) => `${field} = ?`).join(", ");

    updateFields.forEach((field) => values.push(updates[field]));
    values.push(id);

    await db.query(`UPDATE tasks SET ${setClause} WHERE task_id = ?`, values);

    const [updatedTasks] = await db.query("SELECT * FROM tasks WHERE task_id = ?", [
      id,
    ]);

    return res.json({
      message: "Task updated successfully",
      task: updatedTasks[0],
    });
  } catch (error) {
    console.error("Update task error:", error);

    return res.status(500).json({
      message: "Failed to update task",
      error: error.message,
    });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [tasks] = await db.query("SELECT * FROM tasks WHERE task_id = ?", [
      id,
    ]);

    if (tasks.length === 0) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const task = tasks[0];

    if (req.user.role === "employee" && task.assigned_user !== req.user.user_id) {
      return res.status(403).json({
        message: "Access denied, this task is not assigned to you",
      });
    }

    await db.query("UPDATE tasks SET status = ? WHERE task_id = ?", [
      status,
      id,
    ]);

    return res.json({
      message: "Task status updated successfully",
      task: {
        ...task,
        status,
      },
    });
  } catch (error) {
    console.error("Update task status error:", error);

    return res.status(500).json({
      message: "Failed to update task status",
      error: error.message,
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const [tasks] = await db.query("SELECT task_id FROM tasks WHERE task_id = ?", [
      id,
    ]);

    if (tasks.length === 0) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    await db.query("DELETE FROM tasks WHERE task_id = ?", [id]);

    return res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      message: "Failed to delete task",
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