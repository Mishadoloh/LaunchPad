import { Router } from "express";
import {
  clientCreateSchema,
  milestoneCreateSchema,
  milestoneUpdateSchema,
  noteCreateSchema,
  riskCreateSchema,
  riskUpdateSchema,
  timeEntryCreateSchema
} from "@launchpad/shared";
import { Role } from "@prisma/client";
import { asyncHandler, getRouteParam, HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { userPublicSelect } from "./mappers.js";

export const operationsRouter = Router();

const projectMiniSelect = {
  id: true,
  name: true,
  client: true
} as const;

const operationsIncludes = {
  clients: {
    include: {
      projects: {
        include: {
          tasks: {
            select: { status: true }
          }
        }
      }
    },
    orderBy: { name: "asc" as const }
  },
  milestones: {
    include: {
      project: { select: projectMiniSelect }
    },
    orderBy: [{ status: "asc" as const }, { dueDate: "asc" as const }]
  },
  risks: {
    include: {
      project: { select: projectMiniSelect },
      owner: { select: userPublicSelect }
    },
    orderBy: [{ impact: "desc" as const }, { probability: "desc" as const }]
  },
  timeEntries: {
    include: {
      user: { select: userPublicSelect },
      task: {
        select: {
          id: true,
          title: true,
          priority: true,
          project: { select: projectMiniSelect }
        }
      }
    },
    orderBy: { date: "desc" as const },
    take: 80
  },
  notes: {
    include: {
      project: { select: projectMiniSelect },
      author: { select: userPublicSelect }
    },
    orderBy: [{ pinned: "desc" as const }, { createdAt: "desc" as const }],
    take: 40
  }
};

operationsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const [clientsRaw, milestonesRaw, risksRaw, timeEntriesRaw, notesRaw] = await Promise.all([
      prisma.client.findMany(operationsIncludes.clients),
      prisma.milestone.findMany(operationsIncludes.milestones),
      prisma.risk.findMany(operationsIncludes.risks),
      prisma.timeEntry.findMany(operationsIncludes.timeEntries),
      prisma.projectNote.findMany(operationsIncludes.notes)
    ]);

    const clients = clientsRaw.map((client) => ({
      id: client.id,
      name: client.name,
      industry: client.industry,
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      health: client.health,
      notes: client.notes,
      createdAt: client.createdAt.toISOString(),
      projectCount: client.projects.length,
      openTaskCount: client.projects.flatMap((project) => project.tasks).filter((task) => task.status !== "DONE").length,
      pipelineValue: client.projects.filter((project) => project.status !== "SHIPPED").reduce((total, project) => total + project.budget, 0)
    }));

    const milestones = milestonesRaw.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      status: milestone.status,
      dueDate: milestone.dueDate.toISOString(),
      createdAt: milestone.createdAt.toISOString(),
      project: milestone.project
    }));

    const risks = risksRaw.map((risk) => ({
      id: risk.id,
      title: risk.title,
      summary: risk.summary,
      status: risk.status,
      impact: risk.impact,
      probability: risk.probability,
      mitigation: risk.mitigation,
      createdAt: risk.createdAt.toISOString(),
      project: risk.project,
      owner: risk.owner,
      score: riskScore(risk.impact, risk.probability)
    }));

    const timeEntries = timeEntriesRaw.map((entry) => ({
      id: entry.id,
      date: entry.date.toISOString(),
      minutes: entry.minutes,
      note: entry.note,
      billable: entry.billable,
      task: entry.task,
      user: entry.user
    }));

    const notes = notesRaw.map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
      pinned: note.pinned,
      createdAt: note.createdAt.toISOString(),
      project: note.project,
      author: note.author
    }));

    const totalMinutes = timeEntries.reduce((total, entry) => total + entry.minutes, 0);
    const billableMinutes = timeEntries.filter((entry) => entry.billable).reduce((total, entry) => total + entry.minutes, 0);
    const clientHealth = clients.reduce(
      (summary, client) => {
        summary[client.health] += 1;
        return summary;
      },
      { GREEN: 0, YELLOW: 0, RED: 0 }
    );

    res.json({
      clients,
      milestones,
      risks,
      timeEntries,
      notes,
      analytics: {
        totalTrackedHours: roundHours(totalMinutes),
        billableHours: roundHours(billableMinutes),
        nonBillableHours: roundHours(totalMinutes - billableMinutes),
        openRisks: risks.filter((risk) => risk.status === "OPEN" || risk.status === "WATCHING").length,
        criticalRisks: risks.filter((risk) => risk.impact === "CRITICAL").length,
        blockedMilestones: milestones.filter((milestone) => milestone.status === "BLOCKED").length,
        upcomingMilestones: milestones.filter((milestone) => new Date(milestone.dueDate).getTime() > Date.now()).length,
        clientHealth
      }
    });
  })
);

operationsRouter.post(
  "/clients",
  requireAuth,
  requireRole(Role.OWNER, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const input = clientCreateSchema.parse(req.body);
    const client = await prisma.client.create({ data: input });

    await prisma.activity.create({
      data: {
        type: "CLIENT_CREATED",
        message: `Created client ${client.name}`,
        userId: req.user!.id
      }
    });

    res.status(201).json({ client });
  })
);

operationsRouter.post(
  "/milestones",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = milestoneCreateSchema.parse(req.body);
    await assertProjectExists(input.projectId);

    const milestone = await prisma.milestone.create({
      data: {
        ...input,
        dueDate: new Date(input.dueDate)
      },
      include: operationsIncludes.milestones.include
    });

    await prisma.activity.create({
      data: {
        type: "MILESTONE_CREATED",
        message: `Created milestone ${milestone.title}`,
        userId: req.user!.id,
        projectId: milestone.projectId
      }
    });

    res.status(201).json({ milestone });
  })
);

operationsRouter.patch(
  "/milestones/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req, "id");
    const input = milestoneUpdateSchema.parse(req.body);

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined
      },
      include: operationsIncludes.milestones.include
    });

    res.json({ milestone });
  })
);

operationsRouter.post(
  "/risks",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = riskCreateSchema.parse(req.body);
    await assertProjectExists(input.projectId);
    await assertUserExists(input.ownerId);

    const risk = await prisma.risk.create({
      data: input,
      include: operationsIncludes.risks.include
    });

    await prisma.activity.create({
      data: {
        type: "RISK_CREATED",
        message: `Logged risk ${risk.title}`,
        userId: req.user!.id,
        projectId: risk.projectId
      }
    });

    res.status(201).json({ risk });
  })
);

operationsRouter.patch(
  "/risks/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req, "id");
    const input = riskUpdateSchema.parse(req.body);

    const risk = await prisma.risk.update({
      where: { id },
      data: input,
      include: operationsIncludes.risks.include
    });

    res.json({ risk });
  })
);

operationsRouter.post(
  "/time-entries",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = timeEntryCreateSchema.parse(req.body);
    const userId = input.userId ?? req.user!.id;
    await assertTaskExists(input.taskId);
    await assertUserExists(userId);

    const entry = await prisma.timeEntry.create({
      data: {
        taskId: input.taskId,
        userId,
        date: new Date(input.date),
        minutes: input.minutes,
        note: input.note,
        billable: input.billable
      },
      include: operationsIncludes.timeEntries.include
    });

    await prisma.activity.create({
      data: {
        type: "TIME_LOGGED",
        message: `Logged ${roundHours(entry.minutes)}h on ${entry.task.title}`,
        userId: req.user!.id,
        projectId: entry.task.project.id,
        taskId: entry.task.id
      }
    });

    res.status(201).json({ entry });
  })
);

operationsRouter.post(
  "/notes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = noteCreateSchema.parse(req.body);
    await assertProjectExists(input.projectId);

    const note = await prisma.projectNote.create({
      data: {
        ...input,
        authorId: req.user!.id
      },
      include: operationsIncludes.notes.include
    });

    await prisma.activity.create({
      data: {
        type: "NOTE_CREATED",
        message: `Added note ${note.title}`,
        userId: req.user!.id,
        projectId: note.projectId
      }
    });

    res.status(201).json({ note });
  })
);

async function assertProjectExists(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new HttpError(404, "Project not found.");
}

async function assertTaskExists(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new HttpError(404, "Task not found.");
}

async function assertUserExists(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "User not found.");
}

function riskScore(impact: string, probability: number) {
  const weights: Record<string, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
  };

  return Math.round((weights[impact] ?? 1) * probability);
}

function roundHours(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}
