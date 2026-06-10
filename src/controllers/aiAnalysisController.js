import db from "../config/db.js";
import analyzeProjectHealth from "../utils/aiAnalyzer.js";
import createNotification from "../utils/notificationHelper.js";

const parseJsonField = (value, fallback) => {
  if (!value) return fallback;

  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const canAccessProject = async (user, projectId) => {
  if (user.role === "admin") {
    const [projects] = await db.query(
      "SELECT * FROM projects WHERE project_id = ?",
      [projectId]
    );

    return projects[0] || null;
  }

  if (user.role === "client") {
    const [projects] = await db.query(
      "SELECT * FROM projects WHERE project_id = ? AND client_id = ?",
      [projectId, user.user_id]
    );

    return projects[0] || null;
  }

  if (user.role === "employee") {
    const [projects] = await db.query(
      `
      SELECT DISTINCT p.*
      FROM projects p
      INNER JOIN tasks t ON t.project_id = p.project_id
      WHERE p.project_id = ?
      AND t.assigned_user = ?
      `,
      [projectId, user.user_id]
    );

    return projects[0] || null;
  }

  return null;
};

export const analyzeProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await canAccessProject(req.user, projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found or access denied",
      });
    }

    const [tasks] = await db.query(
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
        u.email AS assigned_user_email
      FROM tasks t
      LEFT JOIN users u ON u.user_id = t.assigned_user
      WHERE t.project_id = ?
      ORDER BY 
        CASE t.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        t.deadline ASC
      `,
      [projectId]
    );

    const analysis = analyzeProjectHealth({
      project,
      tasks,
    });

    const [previousAnalysisRows] = await db.query(
      `
      SELECT risk_level
      FROM ai_analysis
      WHERE project_id = ?
      ORDER BY analyzed_at DESC, analysis_id DESC
      LIMIT 1
      `,
      [projectId]
    );

    const previousRiskLevel = previousAnalysisRows[0]?.risk_level || null;

    const recommendationsJson = JSON.stringify(analysis.recommendations);
    const bottlenecksJson = JSON.stringify(analysis.bottlenecks);
    const metricsJson = JSON.stringify(analysis.metrics);

    const [result] = await db.query(
      `
      INSERT INTO ai_analysis (
        project_id,
        health_score,
        risk_level,
        delay_prediction,
        summary,
        recommendations,
        bottlenecks,
        metrics
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        project.project_id,
        analysis.health_score,
        analysis.risk_level,
        analysis.delay_prediction,
        analysis.summary,
        recommendationsJson,
        bottlenecksJson,
        metricsJson,
      ]
    );

    const savedAnalysis = {
      analysis_id: result.insertId,
      project_id: project.project_id,
      project_name: project.name,
      health_score: analysis.health_score,
      risk_level: analysis.risk_level,
      delay_prediction: analysis.delay_prediction,
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      bottlenecks: analysis.bottlenecks,
      metrics: analysis.metrics,
      analyzed_at: new Date(),
    };

    const isDangerousRisk =
      analysis.risk_level === "high" || analysis.risk_level === "critical";

    const isNewRiskChange = previousRiskLevel !== analysis.risk_level;

    if (isDangerousRisk && isNewRiskChange && project.created_by) {
      await createNotification({
        io: req.app.get("io"),
        message: `AI detected ${analysis.risk_level} risk in project "${project.name}" with health score ${analysis.health_score}%.`,
        type: "ai_risk_detected",
        alert_user: project.created_by,
      });
    }

    return res.status(201).json({
      message: "Project AI analysis generated successfully",
      analysis: savedAnalysis,
    });
  } catch (error) {
    console.error("Analyze project error:", error);

    return res.status(500).json({
      message: "Server error while analyzing project",
      error: error.message,
    });
  }
};

export const getLatestProjectAnalysis = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await canAccessProject(req.user, projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found or access denied",
      });
    }

    const [analysisRows] = await db.query(
      `
      SELECT 
        analysis_id,
        project_id,
        health_score,
        risk_level,
        delay_prediction,
        summary,
        recommendations,
        bottlenecks,
        metrics,
        analyzed_at
      FROM ai_analysis
      WHERE project_id = ?
      ORDER BY analyzed_at DESC, analysis_id DESC
      LIMIT 1
      `,
      [projectId]
    );

    if (analysisRows.length === 0) {
      return res.status(404).json({
        message: "No AI analysis found for this project",
      });
    }

    const analysis = analysisRows[0];

    return res.json({
      analysis: {
        ...analysis,
        project_name: project.name,
        recommendations: parseJsonField(analysis.recommendations, []),
        bottlenecks: parseJsonField(analysis.bottlenecks, []),
        metrics: parseJsonField(analysis.metrics, {}),
      },
    });
  } catch (error) {
    console.error("Get latest project analysis error:", error);

    return res.status(500).json({
      message: "Server error while getting project analysis",
      error: error.message,
    });
  }
};

export const getMyAiAnalyses = async (req, res) => {
  try {
    let query = `
      SELECT 
        aa.analysis_id,
        aa.project_id,
        p.name AS project_name,
        p.status AS project_status,
        p.priority AS project_priority,
        p.deadline AS project_deadline,
        aa.health_score,
        aa.risk_level,
        aa.delay_prediction,
        aa.summary,
        aa.recommendations,
        aa.bottlenecks,
        aa.metrics,
        aa.analyzed_at
      FROM ai_analysis aa
      INNER JOIN projects p ON p.project_id = aa.project_id
    `;

    const params = [];

    if (req.user.role === "client") {
      query += ` WHERE p.client_id = ?`;
      params.push(req.user.user_id);
    }

    if (req.user.role === "employee") {
      query += `
        INNER JOIN tasks t ON t.project_id = p.project_id
        WHERE t.assigned_user = ?
      `;
      params.push(req.user.user_id);
    }

    query += `
      ORDER BY aa.analyzed_at DESC, aa.analysis_id DESC
      LIMIT 50
    `;

    const [rows] = await db.query(query, params);

    const analyses = rows.map((analysis) => ({
      ...analysis,
      recommendations: parseJsonField(analysis.recommendations, []),
      bottlenecks: parseJsonField(analysis.bottlenecks, []),
      metrics: parseJsonField(analysis.metrics, {}),
    }));

    return res.json({
      count: analyses.length,
      analyses,
    });
  } catch (error) {
    console.error("Get AI analyses error:", error);

    return res.status(500).json({
      message: "Server error while getting AI analyses",
      error: error.message,
    });
  }
};