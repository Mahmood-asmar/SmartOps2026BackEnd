import db from "../config/db.js";
import analyzeProjectHealth from "./aiAnalyzer.js";
import createNotification from "./notificationHelper.js";

const getProjectTasks = async (projectId) => {
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

  return tasks;
};

const runProjectAiAnalysis = async ({ projectId, io, notify = true }) => {
  const [projects] = await db.query(
    `
    SELECT *
    FROM projects
    WHERE project_id = ?
    `,
    [projectId]
  );

  const project = projects[0];

  if (!project) {
    return null;
  }

  const tasks = await getProjectTasks(projectId);

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
      JSON.stringify(analysis.recommendations),
      JSON.stringify(analysis.bottlenecks),
      JSON.stringify(analysis.metrics),
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

  if (notify && isDangerousRisk && isNewRiskChange && project.created_by) {
    await createNotification({
      io,
      message: `AI detected ${analysis.risk_level} risk in project "${project.name}" with health score ${analysis.health_score}%.`,
      type: "ai_risk_detected",
      alert_user: project.created_by,
    });
  }

  return savedAnalysis;
};

export default runProjectAiAnalysis;