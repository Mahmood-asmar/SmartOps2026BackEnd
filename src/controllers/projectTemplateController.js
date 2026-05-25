import db from "../config/db.js";

const getAllProjectTemplates = async (req, res) => {
  try {
    const [templates] = await db.query(`
      SELECT 
        pt.template_id,
        pt.name,
        pt.description,
        pt.category,
        pt.estimated_duration,
        pt.created_by,
        u.name AS created_by_name,
        pt.created_at
      FROM project_templates pt
      JOIN users u ON pt.created_by = u.user_id
      ORDER BY pt.created_at DESC
    `);

    return res.json({
      message: "Project templates fetched successfully",
      templates,
    });
  } catch (error) {
    console.error("Get project templates error:", error);

    return res.status(500).json({
      message: "Failed to fetch project templates",
      error: error.message,
    });
  }
};

const getProjectTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const [templates] = await db.query(
      `
      SELECT 
        pt.template_id,
        pt.name,
        pt.description,
        pt.category,
        pt.estimated_duration,
        pt.created_by,
        u.name AS created_by_name,
        pt.created_at
      FROM project_templates pt
      JOIN users u ON pt.created_by = u.user_id
      WHERE pt.template_id = ?
      `,
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({
        message: "Project template not found",
      });
    }

    return res.json({
      message: "Project template fetched successfully",
      template: templates[0],
    });
  } catch (error) {
    console.error("Get project template by id error:", error);

    return res.status(500).json({
      message: "Failed to fetch project template",
      error: error.message,
    });
  }
};

const createProjectTemplate = async (req, res) => {
  try {
    const { name, description, category, estimated_duration } = req.body;

    const [result] = await db.query(
      `INSERT INTO project_templates 
       (name, description, category, estimated_duration, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        category || null,
        estimated_duration || null,
        req.user.user_id,
      ]
    );

    return res.status(201).json({
      message: "Project template created successfully",
      template: {
        template_id: result.insertId,
        name,
        description: description || null,
        category: category || null,
        estimated_duration: estimated_duration || null,
        created_by: req.user.user_id,
      },
    });
  } catch (error) {
    console.error("Create project template error:", error);

    return res.status(500).json({
      message: "Failed to create project template",
      error: error.message,
    });
  }
};

const updateProjectTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, estimated_duration } = req.body;

    const [templates] = await db.query(
      "SELECT * FROM project_templates WHERE template_id = ?",
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({
        message: "Project template not found",
      });
    }

    const updates = {};
    const values = [];

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (estimated_duration !== undefined) {
      updates.estimated_duration = estimated_duration;
    }

    const updateFields = Object.keys(updates);

    if (updateFields.length === 0) {
      return res.status(400).json({
        message: "No fields provided for update",
      });
    }

    const setClause = updateFields.map((field) => `${field} = ?`).join(", ");

    updateFields.forEach((field) => values.push(updates[field]));
    values.push(id);

    await db.query(
      `UPDATE project_templates SET ${setClause} WHERE template_id = ?`,
      values
    );

    const [updatedTemplates] = await db.query(
      "SELECT * FROM project_templates WHERE template_id = ?",
      [id]
    );

    return res.json({
      message: "Project template updated successfully",
      template: updatedTemplates[0],
    });
  } catch (error) {
    console.error("Update project template error:", error);

    return res.status(500).json({
      message: "Failed to update project template",
      error: error.message,
    });
  }
};

const deleteProjectTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const [templates] = await db.query(
      "SELECT template_id FROM project_templates WHERE template_id = ?",
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({
        message: "Project template not found",
      });
    }

    await db.query("DELETE FROM project_templates WHERE template_id = ?", [id]);

    return res.json({
      message: "Project template deleted successfully",
    });
  } catch (error) {
    console.error("Delete project template error:", error);

    return res.status(500).json({
      message: "Failed to delete project template",
      error: error.message,
    });
  }
};

export {
  getAllProjectTemplates,
  getProjectTemplateById,
  createProjectTemplate,
  updateProjectTemplate,
  deleteProjectTemplate,
};