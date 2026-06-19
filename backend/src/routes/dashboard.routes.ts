import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { mapProject, mapTask, projectInclude, taskInclude, userPublicSelect } from "./mappers.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [projectsRaw, tasksRaw, teamRaw, activityRaw] = await Promise.all([
      prisma.project.findMany({
        include: projectInclude,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }]
      }),
      prisma.task.findMany({
        include: taskInclude,
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 12
      }),
      prisma.user.findMany({
        select: {
          ...userPublicSelect,
          tasks: {
            select: { status: true }
          }
        },
        orderBy: { name: "asc" }
      }),
      prisma.activity.findMany({
        include: {
          user: { select: userPublicSelect }
        },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);

    const projects = projectsRaw.map(mapProject);
    const tasks = tasksRaw.map(mapTask);
    const activeProjects = projects.filter((project) => project.status === "ACTIVE").length;
    const shippedProjects = projects.filter((project) => project.status === "SHIPPED").length;
    const openTasks = tasks.filter((task) => task.status !== "DONE").length;
    const reviewTasks = tasks.filter((task) => task.status === "REVIEW").length;
    const urgentTasks = tasks.filter((task) => task.priority === "URGENT").length;
    const revenuePipeline = projects
      .filter((project) => project.status !== "SHIPPED")
      .reduce((total, project) => total + project.budget, 0);
    const averageProgress =
      projects.length === 0 ? 0 : Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length);

    res.json({
      metrics: {
        activeProjects,
        shippedProjects,
        openTasks,
        reviewTasks,
        urgentTasks,
        revenuePipeline,
        averageProgress
      },
      projects,
      tasks,
      team: teamRaw.map(({ tasks: userTasks, ...user }) => ({
        ...user,
        openTasks: userTasks.filter((task) => task.status !== "DONE").length,
        doneTasks: userTasks.filter((task) => task.status === "DONE").length
      })),
      activity: activityRaw.map((activity) => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        createdAt: activity.createdAt.toISOString(),
        user: activity.user
      }))
    });
  })
);
