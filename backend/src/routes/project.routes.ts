import { Router } from "express";
import { projectCreateSchema, projectUpdateSchema } from "@launchpad/shared";
import { Role } from "@prisma/client";
import { asyncHandler, getRouteParam, HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { mapProject, projectInclude } from "./mappers.js";

export const projectRouter = Router();

projectRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const projects = await prisma.project.findMany({
      include: projectInclude,
      orderBy: { dueDate: "asc" }
    });

    res.json({ projects: projects.map(mapProject) });
  })
);

projectRouter.post(
  "/",
  requireAuth,
  requireRole(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const input = projectCreateSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        ...input,
        dueDate: new Date(input.dueDate),
        ownerId: req.user!.id
      },
      include: projectInclude
    });

    await prisma.activity.create({
      data: {
        type: "PROJECT_CREATED",
        message: `Created ${project.name}`,
        userId: req.user!.id,
        projectId: project.id
      }
    });

    res.status(201).json({ project: mapProject(project) });
  })
);

projectRouter.patch(
  "/:id",
  requireAuth,
  requireRole(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req, "id");
    const input = projectUpdateSchema.parse(req.body);
    const exists = await prisma.project.findUnique({ where: { id } });

    if (!exists) {
      throw new HttpError(404, "Project not found.");
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined
      },
      include: projectInclude
    });

    await prisma.activity.create({
      data: {
        type: "PROJECT_UPDATED",
        message: `Updated ${project.name}`,
        userId: req.user!.id,
        projectId: project.id
      }
    });

    res.json({ project: mapProject(project) });
  })
);
