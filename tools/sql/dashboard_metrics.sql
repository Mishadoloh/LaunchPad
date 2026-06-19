-- Dashboard metrics for direct SQLite inspection.

WITH task_counts AS (
  SELECT
    projectId,
    COUNT(*) AS total_tasks,
    SUM(CASE WHEN status = 'TODO' THEN 1 ELSE 0 END) AS todo_tasks,
    SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS active_tasks,
    SUM(CASE WHEN status = 'REVIEW' THEN 1 ELSE 0 END) AS review_tasks,
    SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS done_tasks,
    SUM(CASE WHEN dueDate < date('now') AND status <> 'DONE' THEN 1 ELSE 0 END) AS overdue_tasks
  FROM Task
  GROUP BY projectId
),
risk_counts AS (
  SELECT
    projectId,
    COUNT(*) AS total_risks,
    SUM(CASE WHEN status <> 'CLOSED' THEN 1 ELSE 0 END) AS open_risks,
    SUM(CASE WHEN severity = 'HIGH' AND status <> 'CLOSED' THEN 1 ELSE 0 END) AS high_risks
  FROM Risk
  GROUP BY projectId
),
time_totals AS (
  SELECT
    projectId,
    ROUND(SUM(hours), 2) AS logged_hours
  FROM TimeEntry
  GROUP BY projectId
)
SELECT
  p.id,
  p.name,
  c.name AS client,
  p.status,
  p.health,
  p.progress,
  COALESCE(t.total_tasks, 0) AS total_tasks,
  COALESCE(t.todo_tasks, 0) AS todo_tasks,
  COALESCE(t.active_tasks, 0) AS active_tasks,
  COALESCE(t.review_tasks, 0) AS review_tasks,
  COALESCE(t.done_tasks, 0) AS done_tasks,
  COALESCE(t.overdue_tasks, 0) AS overdue_tasks,
  COALESCE(r.total_risks, 0) AS total_risks,
  COALESCE(r.open_risks, 0) AS open_risks,
  COALESCE(r.high_risks, 0) AS high_risks,
  COALESCE(tt.logged_hours, 0) AS logged_hours
FROM Project p
LEFT JOIN Client c ON c.id = p.clientId
LEFT JOIN task_counts t ON t.projectId = p.id
LEFT JOIN risk_counts r ON r.projectId = p.id
LEFT JOIN time_totals tt ON tt.projectId = p.id
ORDER BY overdue_tasks DESC, open_risks DESC, p.updatedAt DESC;
