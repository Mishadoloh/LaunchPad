import type { Prisma } from "@prisma/client";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true
} satisfies Prisma.UserSelect;

export const userPublicSelect = userSelect;

export const taskInclude = {
  project: {
    select: {
      id: true,
      name: true,
      client: true
    }
  },
  assignee: {
    select: userPublicSelect
  },
  _count: {
    select: {
      comments: true
    }
  }
} satisfies Prisma.TaskInclude;

export const projectInclude = {
  owner: {
    select: userPublicSelect
  },
  tasks: {
    select: {
      status: true
    }
  }
} satisfies Prisma.ProjectInclude;

export function mapTask(task: Prisma.TaskGetPayload<{ include: typeof taskInclude }>) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimateHours: task.estimateHours,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    project: task.project,
    assignee: task.assignee,
    commentCount: task._count.comments
  };
}

export function mapProject(project: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>) {
  const taskCount = project.tasks.length;
  const doneTaskCount = project.tasks.filter((task) => task.status === "DONE").length;

  return {
    id: project.id,
    name: project.name,
    client: project.client,
    description: project.description,
    status: project.status,
    budget: project.budget,
    dueDate: project.dueDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    progress: taskCount === 0 ? 0 : Math.round((doneTaskCount / taskCount) * 100),
    owner: project.owner,
    taskCount,
    doneTaskCount
  };
}
