import { Router } from "express";
import { commentCreateSchema, taskCreateSchema, taskUpdateSchema } from "@launchpad/shared";
import { asyncHandler, getRouteParam, HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { mapTask, taskInclude, userPublicSelect } from "./mappers.js";

export const taskRouter = Router();

taskRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: taskInclude,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }]
    });

    res.json({ tasks: tasks.map(mapTask) });
  })
);

taskRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = taskCreateSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });

    if (!project) {
      throw new HttpError(404, "Project not found.");
    }

    const task = await prisma.task.create({
      data: input,
      include: taskInclude
    });

    await prisma.activity.create({
      data: {
        type: "TASK_CREATED",
        message: `Created task ${task.title}`,
        userId: req.user!.id,
        projectId: task.projectId,
        taskId: task.id
      }
    });

    res.status(201).json({ task: mapTask(task) });
  })
);

taskRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req, "id");
    const input = taskUpdateSchema.parse(req.body);
    const exists = await prisma.task.findUnique({ where: { id } });

    if (!exists) {
      throw new HttpError(404, "Task not found.");
    }

    const task = await prisma.task.update({
      where: { id },
      data: input,
      include: taskInclude
    });

    await prisma.activity.create({
      data: {
        type: "TASK_UPDATED",
        message: `Updated task ${task.title}`,
        userId: req.user!.id,
        projectId: task.projectId,
        taskId: task.id
      }
    });

    res.json({ task: mapTask(task) });
  })
);

taskRouter.get(
  "/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req, "id");
    const comments = await prisma.taskComment.findMany({
      where: { taskId: id },
      include: { author: { select: userPublicSelect } },
      orderBy: { createdAt: "asc" }
    });

    res.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author
      }))
    });
  })
);

taskRouter.post(
  "/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req, "id");
    const input = commentCreateSchema.parse(req.body);
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new HttpError(404, "Task not found.");
    }

    const comment = await prisma.taskComment.create({
      data: {
        body: input.body,
        taskId: task.id,
        authorId: req.user!.id
      },
      include: { author: { select: userPublicSelect } }
    });

    await prisma.activity.create({
      data: {
        type: "COMMENT_ADDED",
        message: `Commented on ${task.title}`,
        userId: req.user!.id,
        projectId: task.projectId,
        taskId: task.id
      }
    });

    res.status(201).json({
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author
      }
    });
  })
);
