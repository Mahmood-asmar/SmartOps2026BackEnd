import db from "../config/db.js";
import createNotification from "../utils/notificationHelper.js";
import runProjectAiAnalysis from "../utils/runProjectAiAnalysis.js";

const getAllProjects = async (req, res) => {
  try {
    let query = `
      SELECT DISTINCT
        p.project_id,
        p.name,
        p.description,
        p.category,
        p.client_id,
        client.name AS client_name,
        p.template_id,
        pt.name AS template_name,
        p.start_date,
        p.deadline,
        p.status,
        p.priority,
        p.created_by,
        creator.name AS created_by_name,
        p.created_at
      FROM projects p
      LEFT JOIN users client ON p.client_id = client.user_id
      LEFT JOIN project_templates pt ON p.template_id = pt.template_id
      JOIN users creator ON p.created_by = creator.user_id
    `;

    const values = [];

    if (req.user.role === "employee") {
      query += `
        JOIN tasks t ON t.project_id = p.project_id
      `;
    }

    const conditions = [];

    if (req.user.role === "client") {
      conditions.push("p.client_id = ?");
      values.push(req.user.user_id);
    }

    if (req.user.role === "employee") {
      conditions.push("t.assigned_user = ?");
      values.push(req.user.user_id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const [projects] = await db.query(query, values);

    return res.json({
      message: "Projects fetched successfully",
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      message: "Failed to fetch projects",
      error: error.message,
    });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const [projects] = await db.query(
      `
      SELECT 
        p.project_id,
        p.name,
        p.description,
        p.category,
        p.client_id,
        client.name AS client_name,
        p.template_id,
        pt.name AS template_name,
        p.start_date,
        p.deadline,
        p.status,
        p.priority,
        p.created_by,
        creator.name AS created_by_name,
        p.created_at
      FROM projects p
      LEFT JOIN users client ON p.client_id = client.user_id
      LEFT JOIN project_templates pt ON p.template_id = pt.template_id
      JOIN users creator ON p.created_by = creator.user_id
      WHERE p.project_id = ?
      `,
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const project = projects[0];

    if (req.user.role === "client" && project.client_id !== req.user.user_id) {
      return res.status(403).json({
        message: "Access denied, this project does not belong to you",
      });
    }

    if (req.user.role === "employee") {
      const [tasks] = await db.query(
        `SELECT task_id 
         FROM tasks 
         WHERE project_id = ? AND assigned_user = ?`,
        [id, req.user.user_id]
      );

      if (tasks.length === 0) {
        return res.status(403).json({
          message: "Access denied, you are not assigned to this project",
        });
      }
    }

    return res.json({
      message: "Project fetched successfully",
      project,
    });
  } catch (error) {
    console.error("Get project by id error:", error);

    return res.status(500).json({
      message: "Failed to fetch project",
      error: error.message,
    });
  }
};

const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      client_id,
      template_id,
      start_date,
      deadline,
      status,
      priority,
    } = req.body;

    if (client_id) {
      const [clients] = await db.query(
        "SELECT user_id FROM users WHERE user_id = ? AND role = 'client'",
        [client_id]
      );

      if (clients.length === 0) {
        return res.status(400).json({
          message: "Client not found or user is not a client",
        });
      }
    }

    if (template_id) {
      const [templates] = await db.query(
        "SELECT template_id FROM project_templates WHERE template_id = ?",
        [template_id]
      );

      if (templates.length === 0) {
        return res.status(400).json({
          message: "Project template not found",
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO projects
       (name, description, category, client_id, template_id, start_date, deadline, status, priority, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        category || null,
        client_id || null,
        template_id || null,
        start_date || null,
        deadline || null,
        status || "pending",
        priority || "medium",
        req.user.user_id,
      ]
    );

    return res.status(201).json({
      message: "Project created successfully",
      project: {
        project_id: result.insertId,
        name,
        description: description || null,
        category: category || null,
        client_id: client_id || null,
        template_id: template_id || null,
        start_date: start_date || null,
        deadline: deadline || null,
        status: status || "pending",
        priority: priority || "medium",
        created_by: req.user.user_id,
      },
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      message: "Failed to create project",
      error: error.message,
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      client_id,
      clientId,
      template_id,
      templateId,
      category,
      start_date,
      startDate,
      deadline,
      status,
      priority,
    } = req.body;

    const finalClientId = client_id ?? clientId;
    const finalTemplateId = template_id ?? templateId;
    const finalStartDate = start_date ?? startDate;

    const allowedStatuses = [
      "pending",
      "in_progress",
      "completed",
      "cancelled",
    ];

    const allowedPriorities = ["low", "medium", "high"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid project status.",
      });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid project priority.",
      });
    }

    const [projectRows] = await db.query(
      `
      SELECT *
      FROM projects
      WHERE project_id = ?
      `,
      [id]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    const oldProject = projectRows[0];

    const updatedName = name ?? oldProject.name;
    const updatedDescription = description ?? oldProject.description;
    const updatedClientId =
      finalClientId !== undefined ? finalClientId : oldProject.client_id;
    const updatedTemplateId =
      finalTemplateId !== undefined ? finalTemplateId : oldProject.template_id;
    const updatedCategory = category ?? oldProject.category;
    const updatedStartDate =
      finalStartDate !== undefined ? finalStartDate : oldProject.start_date;
    const updatedDeadline =
      deadline !== undefined ? deadline : oldProject.deadline;
    const updatedStatus = status ?? oldProject.status;
    const updatedPriority = priority ?? oldProject.priority;

    await db.query(
      `
      UPDATE projects
      SET
        name = ?,
        description = ?,
        client_id = ?,
        template_id = ?,
        category = ?,
        start_date = ?,
        deadline = ?,
        status = ?,
        priority = ?
      WHERE project_id = ?
      `,
      [
        updatedName,
        updatedDescription,
        updatedClientId || null,
        updatedTemplateId || null,
        updatedCategory,
        updatedStartDate || null,
        updatedDeadline || null,
        updatedStatus,
        updatedPriority,
        id,
      ]
    );

    const [updatedProjectRows] = await db.query(
      `
      SELECT 
        p.*,
        c.name AS client_name,
        creator.name AS created_by_name,
        pt.name AS template_name
      FROM projects p
      LEFT JOIN users c ON c.user_id = p.client_id
      LEFT JOIN users creator ON creator.user_id = p.created_by
      LEFT JOIN project_templates pt ON pt.template_id = p.template_id
      WHERE p.project_id = ?
      `,
      [id]
    );

    const updatedProject = updatedProjectRows[0];

    const io = req.app.get("io");

    const statusChanged = oldProject.status !== updatedStatus;
    const priorityChanged = oldProject.priority !== updatedPriority;

    if (
      statusChanged &&
      updatedStatus === "completed" &&
      updatedProject.client_id
    ) {
      try {
        await createNotification({
          io,
          message: `Project "${updatedProject.name}" has been completed.`,
          type: "project_completed",
          alert_user: updatedProject.client_id,
        });
      } catch (notificationError) {
        console.error("Project completed notification error:", notificationError);
      }
    }

    let aiAnalysis = null;

    if (statusChanged || priorityChanged) {
      try {
        aiAnalysis = await runProjectAiAnalysis({
          projectId: updatedProject.project_id,
          io,
          notify: true,
        });
      } catch (aiError) {
        console.error("Auto AI analysis after project update error:", aiError);
      }
    }

    return res.json({
      message: "Project updated successfully.",
      project: updatedProject,
      ai_analysis: aiAnalysis,
    });
  } catch (error) {
    console.error("Update project error:", error);

    return res.status(500).json({
      message: "Server error while updating project.",
      error: error.message,
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const [projects] = await db.query(
      "SELECT project_id FROM projects WHERE project_id = ?",
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await db.query("DELETE FROM projects WHERE project_id = ?", [id]);

    return res.json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return res.status(500).json({
      message: "Failed to delete project",
      error: error.message,
    });
  }
};

export {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};