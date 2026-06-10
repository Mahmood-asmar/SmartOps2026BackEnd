const DAY_IN_MS = 1000 * 60 * 60 * 24;

const calculateDaysLeft = (deadline) => {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) return null;

  const today = new Date();
  const diff = deadlineDate.getTime() - today.getTime();

  return Math.ceil(diff / DAY_IN_MS);
};

const calculateTaskStats = (tasks = []) => {
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter((task) => task.status === "completed");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const pendingTasks = tasks.filter((task) => task.status === "pending");

  const overdueTasks = tasks.filter((task) => {
    if (!task.deadline || task.status === "completed") return false;

    const taskDeadline = new Date(task.deadline);
    if (Number.isNaN(taskDeadline.getTime())) return false;

    return taskDeadline < new Date();
  });

  const highPriorityTasks = tasks.filter((task) => task.priority === "high");

  const highPriorityPendingTasks = tasks.filter(
    (task) => task.priority === "high" && task.status !== "completed"
  );

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasksCount: completedTasks.length,
    inProgressTasksCount: inProgressTasks.length,
    pendingTasksCount: pendingTasks.length,
    overdueTasksCount: overdueTasks.length,
    highPriorityTasksCount: highPriorityTasks.length,
    highPriorityPendingTasksCount: highPriorityPendingTasks.length,
    completionRate,
    overdueTasks,
    highPriorityPendingTasks,
  };
};

const calculateHealthScore = ({ project, taskStats, daysLeft }) => {
  let score = 100;

  if (project.status === "completed") {
    return 100;
  }

  if (project.status === "cancelled") {
    return 0;
  }

  if (taskStats.totalTasks === 0) {
    score -= 20;
  }

  score -= taskStats.pendingTasksCount * 4;
  score -= taskStats.overdueTasksCount * 12;
  score -= taskStats.highPriorityPendingTasksCount * 8;

  if (daysLeft !== null) {
    if (daysLeft < 0) score -= 25;
    else if (daysLeft <= 3) score -= 18;
    else if (daysLeft <= 7) score -= 10;
  }

  if (taskStats.completionRate >= 80) score += 10;
  if (taskStats.completionRate >= 50) score += 5;

  return Math.max(0, Math.min(100, score));
};

const getRiskLevel = (healthScore) => {
  if (healthScore >= 80) return "low";
  if (healthScore >= 60) return "medium";
  if (healthScore >= 35) return "high";
  return "critical";
};

const getDelayPrediction = ({ riskLevel, daysLeft, taskStats }) => {
  if (riskLevel === "critical") {
    return "Critical delay risk detected";
  }

  if (riskLevel === "high") {
    return "High delay risk detected";
  }

  if (daysLeft !== null && daysLeft < 0) {
    return "Project deadline has already passed";
  }

  if (daysLeft !== null && daysLeft <= 7 && taskStats.completionRate < 70) {
    return "Possible delay detected due to upcoming deadline and incomplete tasks";
  }

  if (taskStats.overdueTasksCount > 0) {
    return "Delay risk detected because some tasks are overdue";
  }

  return "No major delay risk detected";
};

const buildSummary = ({
  project,
  taskStats,
  daysLeft,
  healthScore,
  riskLevel,
}) => {
  if (project.status === "completed") {
    return `Project "${project.name}" is completed with a health score of ${healthScore}.`;
  }

  if (taskStats.totalTasks === 0) {
    return `Project "${project.name}" has no tasks yet. Add tasks to improve tracking and analysis accuracy.`;
  }

  const deadlineText =
    daysLeft === null
      ? "without a clear deadline"
      : daysLeft < 0
      ? `with a deadline overdue by ${Math.abs(daysLeft)} day(s)`
      : `with ${daysLeft} day(s) left until the deadline`;

  return `Project "${project.name}" is currently classified as ${riskLevel} risk with a health score of ${healthScore}. It has ${taskStats.totalTasks} task(s), ${taskStats.completedTasksCount} completed, ${taskStats.pendingTasksCount} pending, and ${taskStats.overdueTasksCount} overdue task(s), ${deadlineText}.`;
};

const buildRecommendations = ({ taskStats, daysLeft, riskLevel }) => {
  const recommendations = [];

  if (taskStats.totalTasks === 0) {
    recommendations.push(
      "Create clear tasks for this project to track progress."
    );
  }

  if (taskStats.overdueTasksCount > 0) {
    recommendations.push(
      "Review overdue tasks immediately and update their deadlines or status."
    );
  }

  if (taskStats.highPriorityPendingTasksCount > 0) {
    recommendations.push(
      "Focus on high-priority pending tasks before normal priority work."
    );
  }

  if (daysLeft !== null && daysLeft <= 7 && daysLeft >= 0) {
    recommendations.push(
      "Increase follow-up frequency because the project deadline is close."
    );
  }

  if (daysLeft !== null && daysLeft < 0) {
    recommendations.push(
      "Escalate the project because the deadline has already passed."
    );
  }

  if (taskStats.completionRate < 50 && taskStats.totalTasks > 0) {
    recommendations.push(
      "Consider assigning additional employees or splitting large tasks."
    );
  }

  if (riskLevel === "low") {
    recommendations.push(
      "Continue monitoring progress and keep the current execution plan."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("No urgent action required at the moment.");
  }

  return recommendations;
};

const getBottlenecks = (tasks = []) => {
  return tasks
    .filter((task) => {
      if (task.status === "completed") return false;

      const isHighPriority = task.priority === "high";
      const isOverdue = task.deadline && new Date(task.deadline) < new Date();

      return isHighPriority || isOverdue;
    })
    .slice(0, 5)
    .map((task) => ({
      task_id: task.task_id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      reason:
        task.priority === "high"
          ? "High priority task is not completed"
          : "Task deadline is overdue",
    }));
};

const analyzeProjectHealth = ({ project, tasks }) => {
  const daysLeft = calculateDaysLeft(project.deadline);
  const taskStats = calculateTaskStats(tasks);

  const healthScore = calculateHealthScore({
    project,
    taskStats,
    daysLeft,
  });

  const riskLevel = getRiskLevel(healthScore);

  const delayPrediction = getDelayPrediction({
    riskLevel,
    daysLeft,
    taskStats,
  });

  const summary = buildSummary({
    project,
    taskStats,
    daysLeft,
    healthScore,
    riskLevel,
  });

  const recommendations = buildRecommendations({
    taskStats,
    daysLeft,
    riskLevel,
  });

  const bottlenecks = getBottlenecks(tasks);

  return {
    health_score: healthScore,
    risk_level: riskLevel,
    delay_prediction: delayPrediction,
    summary,
    recommendations,
    bottlenecks,
    metrics: {
      days_left: daysLeft,
      total_tasks: taskStats.totalTasks,
      completed_tasks: taskStats.completedTasksCount,
      in_progress_tasks: taskStats.inProgressTasksCount,
      pending_tasks: taskStats.pendingTasksCount,
      overdue_tasks: taskStats.overdueTasksCount,
      high_priority_tasks: taskStats.highPriorityTasksCount,
      high_priority_pending_tasks: taskStats.highPriorityPendingTasksCount,
      completion_rate: taskStats.completionRate,
    },
  };
};

export default analyzeProjectHealth;