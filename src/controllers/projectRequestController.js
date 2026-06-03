import db from "../config/db.js";

const getAllProjectRequests = async (req, res) => {
  try {
    let query = `
      SELECT
        pr.request_id,
        pr.client_id,
        client.name AS client_name,
        client.email AS client_email,
        pr.project_name,
        pr.description,
        pr.category,
        pr.deadline,
        pr.template_id,
        pt.name AS template_name,
        pr.status,
        pr.rejection_reason,
        pr.project_id,
        pr.created_at,
        pr.reviewed_by,
        reviewer.name AS reviewed_by_name,
        pr.reviewed_at
      FROM project_requests pr
      JOIN users client ON pr.client_id = client.user_id
      LEFT JOIN project_templates pt ON pr.template_id = pt.template_id
      LEFT JOIN users reviewer ON pr.reviewed_by = reviewer.user_id
    `;

    const values = [];

    if (req.user.role === "client") {
      query += " WHERE pr.client_id = ?";
      values.push(req.user.user_id);
    }

    query += " ORDER BY pr.created_at DESC";

    const [requests] = await db.query(query, values);

    return res.json({
      message: "Project requests fetched successfully",
      requests,
    });
  } catch (error) {
    console.error("Get project requests error:", error);

    return res.status(500).json({
      message: "Failed to fetch project requests",
      error: error.message,
    });
  }
};

const getProjectRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const [requests] = await db.query(
      `
      SELECT
        pr.request_id,
        pr.client_id,
        client.name AS client_name,
        client.email AS client_email,
        pr.project_name,
        pr.description,
        pr.category,
        pr.deadline,
        pr.template_id,
        pt.name AS template_name,
        pr.status,
        pr.rejection_reason,
        pr.project_id,
        pr.created_at,
        pr.reviewed_by,
        reviewer.name AS reviewed_by_name,
        pr.reviewed_at
      FROM project_requests pr
      JOIN users client ON pr.client_id = client.user_id
      LEFT JOIN project_templates pt ON pr.template_id = pt.template_id
      LEFT JOIN users reviewer ON pr.reviewed_by = reviewer.user_id
      WHERE pr.request_id = ?
      `,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Project request not found",
      });
    }

    const request = requests[0];

    if (req.user.role === "client" && request.client_id !== req.user.user_id) {
      return res.status(403).json({
        message: "Access denied, this request does not belong to you",
      });
    }

    return res.json({
      message: "Project request fetched successfully",
      request,
    });
  } catch (error) {
    console.error("Get project request by id error:", error);

    return res.status(500).json({
      message: "Failed to fetch project request",
      error: error.message,
    });
  }
};

const createProjectRequest = async (req, res) => {
  try {
    const { project_name, description, category, deadline, template_id } =
      req.body;

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
      `INSERT INTO project_requests
       (client_id, project_name, description, category, deadline, template_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        project_name,
        description || null,
        category || null,
        deadline || null,
        template_id || null,
      ]
    );

    return res.status(201).json({
      message: "Project request created successfully",
      request: {
        request_id: result.insertId,
        client_id: req.user.user_id,
        project_name,
        description: description || null,
        category: category || null,
        deadline: deadline || null,
        template_id: template_id || null,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Create project request error:", error);

    return res.status(500).json({
      message: "Failed to create project request",
      error: error.message,
    });
  }
};

const approveProjectRequest = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [requests] = await connection.query(
      "SELECT * FROM project_requests WHERE request_id = ? FOR UPDATE",
      [id]
    );

    if (requests.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Project request not found",
      });
    }

    const request = requests[0];

    if (request.status === "approved") {
      await connection.rollback();

      return res.status(400).json({
        message: "Project request is already approved",
      });
    }

    if (request.status === "rejected") {
      await connection.rollback();

      return res.status(400).json({
        message: "Rejected project request cannot be approved",
      });
    }

    const [projectResult] = await connection.query(
      `INSERT INTO projects
       (name, description, category, client_id, template_id, start_date, deadline, status, priority, created_by)
       VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?)`,
      [
        request.project_name,
        request.description || null,
        request.category || null,
        request.client_id,
        request.template_id || null,
        request.deadline || null,
        "pending",
        "medium",
        req.user.user_id,
      ]
    );

    const newProjectId = projectResult.insertId;

    await connection.query(
      `UPDATE project_requests
       SET status = 'approved',
           reviewed_by = ?,
           reviewed_at = NOW(),
           project_id = ?
       WHERE request_id = ?`,
      [req.user.user_id, newProjectId, id]
    );

    await connection.query(
      `INSERT INTO notifications (message, type, alert_user)
       VALUES (?, ?, ?)`,
     [
       `Your project request "${request.project_name}" has been approved and converted into a project.`,
       "project_request_approved",
      request.client_id,
     ]
    );

    // Create a notification for the client
  
    await connection.commit();

    return res.json({
      message: "Project request approved and project created successfully",
      project: {
        project_id: newProjectId,
        name: request.project_name,
        description: request.description || null,
        category: request.category || null,
        client_id: request.client_id,
        template_id: request.template_id || null,
        start_date: new Date().toISOString().split("T")[0],
        deadline: request.deadline || null,
        status: "pending",
        priority: "medium",
        created_by: req.user.user_id,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Approve project request error:", error);

    return res.status(500).json({
      message: "Failed to approve project request",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const rejectProjectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const [requests] = await db.query(
      "SELECT * FROM project_requests WHERE request_id = ?",
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Project request not found",
      });
    }

    const request = requests[0];

    if (request.status === "approved") {
      return res.status(400).json({
        message: "Approved project request cannot be rejected",
      });
    }

    if (request.status === "rejected") {
      return res.status(400).json({
        message: "Project request is already rejected",
      });
    }

    await db.query(
      `UPDATE project_requests
       SET status = 'rejected',
           rejection_reason = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE request_id = ?`,
      [rejection_reason, req.user.user_id, id]
    );

    await db.query(
      `INSERT INTO notifications (message, type, alert_user)
       VALUES (?, ?, ?)`,
     [
     `Your project request "${request.project_name}" has been rejected. Reason: ${rejection_reason}`,
     "project_request_rejected",
      request.client_id,
     ]
    );

    return res.json({
      message: "Project request rejected successfully",
    });
  } catch (error) {
    console.error("Reject project request error:", error);

    return res.status(500).json({
      message: "Failed to reject project request",
      error: error.message,
    });
  }
};

const deleteProjectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [requests] = await db.query(
      "SELECT * FROM project_requests WHERE request_id = ?",
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Project request not found",
      });
    }

    const request = requests[0];

    if (req.user.role === "client" && request.client_id !== req.user.user_id) {
      return res.status(403).json({
        message: "Access denied, this request does not belong to you",
      });
    }

    await db.query("DELETE FROM project_requests WHERE request_id = ?", [id]);

    return res.json({
      message: "Project request deleted successfully",
    });
  } catch (error) {
    console.error("Delete project request error:", error);

    return res.status(500).json({
      message: "Failed to delete project request",
      error: error.message,
    });
  }
};

export {
  getAllProjectRequests,
  getProjectRequestById,
  createProjectRequest,
  approveProjectRequest,
  rejectProjectRequest,
  deleteProjectRequest,
};