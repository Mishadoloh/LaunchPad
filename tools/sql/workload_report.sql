-- Team workload report for local SQLite review.

WITH assigned_tasks AS (
  SELECT
    u.id AS user_id,
    u.name,
    u.email,
    t.id AS task_id,
    t.status,
    t.priority,
    t.dueDate,
    t.estimateHours
  FROM User u
  LEFT JOIN Task t ON t.assigneeId = u.id
),
workload AS (
  SELECT
    user_id,
    name,
    email,
    COUNT(task_id) AS total_tasks,
    SUM(CASE WHEN status <> 'DONE' THEN 1 ELSE 0 END) AS open_tasks,
    SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS completed_tasks,
    SUM(CASE WHEN priority = 'HIGH' AND status <> 'DONE' THEN 1 ELSE 0 END) AS high_priority_open,
    SUM(CASE WHEN dueDate < date('now') AND status <> 'DONE' THEN 1 ELSE 0 END) AS overdue_tasks,
    ROUND(SUM(CASE WHEN status <> 'DONE' THEN estimateHours ELSE 0 END), 2) AS remaining_hours
  FROM assigned_tasks
  GROUP BY user_id, name, email
)
SELECT
  user_id,
  name,
  email,
  total_tasks,
  open_tasks,
  completed_tasks,
  high_priority_open,
  overdue_tasks,
  remaining_hours,
  CASE
    WHEN overdue_tasks > 2 THEN 'Needs support'
    WHEN open_tasks > 6 THEN 'High load'
    WHEN open_tasks BETWEEN 1 AND 6 THEN 'Balanced'
    ELSE 'Available'
  END AS load_status
FROM workload
ORDER BY overdue_tasks DESC, open_tasks DESC, name ASC;
