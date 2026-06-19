import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { userPublicSelect } from "./mappers.js";

export const teamRouter = Router();

teamRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        ...userPublicSelect,
        tasks: {
          select: {
            status: true,
            estimateHours: true
          }
        }
      },
      orderBy: { name: "asc" }
    });

    res.json({
      team: users.map(({ tasks, ...user }) => ({
        ...user,
        openTasks: tasks.filter((task) => task.status !== "DONE").length,
        doneTasks: tasks.filter((task) => task.status === "DONE").length,
        plannedHours: tasks.filter((task) => task.status !== "DONE").reduce((total, task) => total + task.estimateHours, 0)
      }))
    });
  })
);
