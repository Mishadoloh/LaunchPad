import bcrypt from "bcryptjs";
import { ClientHealth, MilestoneStatus, PrismaClient, ProjectStatus, RiskImpact, RiskStatus, Role, TaskPriority, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  await prisma.activity.deleteMany();
  await prisma.projectNote.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("launchpad123", 12);

  const [owner, manager, designer, engineer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Marta Kovalenko",
        email: "admin@launchpad.dev",
        passwordHash,
        role: Role.OWNER,
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=faces"
      }
    }),
    prisma.user.create({
      data: {
        name: "Danylo Shevchenko",
        email: "manager@launchpad.dev",
        passwordHash,
        role: Role.MANAGER,
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=faces"
      }
    }),
    prisma.user.create({
      data: {
        name: "Iryna Bondar",
        email: "design@launchpad.dev",
        passwordHash,
        role: Role.MEMBER,
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces"
      }
    }),
    prisma.user.create({
      data: {
        name: "Oleh Melnyk",
        email: "dev@launchpad.dev",
        passwordHash,
        role: Role.MEMBER,
        avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=faces"
      }
    })
  ]);

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: "Northwind Labs",
        industry: "B2B SaaS",
        contactName: "Olivia Parker",
        contactEmail: "olivia@northwind.example",
        health: ClientHealth.GREEN,
        notes: "Strategic account with a high appetite for automation and analytics."
      }
    }),
    prisma.client.create({
      data: {
        name: "Cargo House",
        industry: "Logistics",
        contactName: "Martin Keller",
        contactEmail: "martin@cargohouse.example",
        health: ClientHealth.YELLOW,
        notes: "Discovery is still moving, but stakeholder alignment needs careful facilitation."
      }
    }),
    prisma.client.create({
      data: {
        name: "Green Market",
        industry: "Commerce",
        contactName: "Sofia Ramirez",
        contactEmail: "sofia@greenmarket.example",
        health: ClientHealth.GREEN,
        notes: "Fast-moving team with strong product ownership and clear campaign goals."
      }
    }),
    prisma.client.create({
      data: {
        name: "Nova Education",
        industry: "Education",
        contactName: "Andriy Marchenko",
        contactEmail: "andriy@novaedu.example",
        health: ClientHealth.GREEN,
        notes: "Recently shipped. Support handoff is the main success criterion now."
      }
    })
  ]);

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Pulse CRM",
        client: "Northwind Labs",
        description: "A compact CRM for service teams with lead scoring, customer timelines, and automated follow-ups.",
        status: ProjectStatus.ACTIVE,
        budget: 42000,
        dueDate: daysFromNow(38),
        ownerId: owner.id,
        clientId: clients[0].id
      }
    }),
    prisma.project.create({
      data: {
        name: "Atlas Inventory",
        client: "Cargo House",
        description: "Warehouse visibility platform with stock alerts, supplier performance dashboards, and reorder planning.",
        status: ProjectStatus.DISCOVERY,
        budget: 58000,
        dueDate: daysFromNow(72),
        ownerId: manager.id,
        clientId: clients[1].id
      }
    }),
    prisma.project.create({
      data: {
        name: "Bloom Commerce",
        client: "Green Market",
        description: "Headless storefront revamp with campaign pages, checkout analytics, and subscription flows.",
        status: ProjectStatus.ACTIVE,
        budget: 76000,
        dueDate: daysFromNow(21),
        ownerId: owner.id,
        clientId: clients[2].id
      }
    }),
    prisma.project.create({
      data: {
        name: "Beacon Portal",
        client: "Nova Education",
        description: "Student onboarding portal with document checks, course recommendations, and advisor notes.",
        status: ProjectStatus.SHIPPED,
        budget: 36000,
        dueDate: daysFromNow(-12),
        ownerId: manager.id,
        clientId: clients[3].id
      }
    })
  ]);

  const taskData = [
    ["Map sales pipeline states", "Define every sales state and the automation trigger that moves a lead forward.", TaskStatus.DONE, TaskPriority.HIGH, 8, projects[0].id, manager.id],
    ["Build account overview API", "Expose customer health, last contact, active deals, and next action suggestions.", TaskStatus.IN_PROGRESS, TaskPriority.URGENT, 16, projects[0].id, engineer.id],
    ["Design activity timeline", "Create timeline states for calls, notes, email sync, and system-generated events.", TaskStatus.REVIEW, TaskPriority.HIGH, 10, projects[0].id, designer.id],
    ["Supplier risk matrix", "Score suppliers by delivery delay, quality issues, and stock dependency.", TaskStatus.TODO, TaskPriority.MEDIUM, 12, projects[1].id, manager.id],
    ["Inventory import wizard", "Build CSV validation, column matching, dry-run preview, and import summary.", TaskStatus.BACKLOG, TaskPriority.HIGH, 20, projects[1].id, engineer.id],
    ["Checkout analytics model", "Track funnel loss by traffic source, campaign, device, and payment method.", TaskStatus.IN_PROGRESS, TaskPriority.URGENT, 18, projects[2].id, engineer.id],
    ["Subscription landing page", "Create reusable subscription plan blocks and promotion rules.", TaskStatus.TODO, TaskPriority.MEDIUM, 14, projects[2].id, designer.id],
    ["Campaign calendar", "Add a campaign calendar with launch windows, owners, and budget labels.", TaskStatus.REVIEW, TaskPriority.LOW, 9, projects[2].id, manager.id],
    ["Advisor notes handoff", "Polish advisor notes export and mark the project as ready for support handoff.", TaskStatus.DONE, TaskPriority.MEDIUM, 6, projects[3].id, owner.id]
  ] as const;

  const tasks = [];
  for (const [title, description, status, priority, estimateHours, projectId, assigneeId] of taskData) {
    tasks.push(
      await prisma.task.create({
        data: { title, description, status, priority, estimateHours, projectId, assigneeId }
      })
    );
  }

  await prisma.taskComment.createMany({
    data: [
      { body: "Keep the edge cases in the walkthrough; they make the workflow easier to explain.", taskId: tasks[1].id, authorId: owner.id },
      { body: "Ready for API review. The response shape matches the frontend board.", taskId: tasks[2].id, authorId: designer.id },
      { body: "Let's split supplier scoring into a separate service after the discovery call.", taskId: tasks[3].id, authorId: manager.id }
    ]
  });

  await prisma.milestone.createMany({
    data: [
      {
        title: "CRM beta walkthrough",
        description: "Run the first end-to-end walkthrough with customer success and sales leadership.",
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: daysFromNow(9),
        projectId: projects[0].id
      },
      {
        title: "Inventory discovery sign-off",
        description: "Lock the warehouse workflow map and agree on the import constraints.",
        status: MilestoneStatus.PLANNED,
        dueDate: daysFromNow(18),
        projectId: projects[1].id
      },
      {
        title: "Commerce analytics freeze",
        description: "Freeze checkout analytics events before campaign pages enter QA.",
        status: MilestoneStatus.BLOCKED,
        dueDate: daysFromNow(5),
        projectId: projects[2].id
      },
      {
        title: "Support handoff",
        description: "Transfer Beacon Portal playbooks, escalation paths, and known issues.",
        status: MilestoneStatus.DONE,
        dueDate: daysFromNow(-5),
        projectId: projects[3].id
      },
      {
        title: "Subscription launch readiness",
        description: "Validate promo rules, payment methods, subscription copy, and analytics tags.",
        status: MilestoneStatus.PLANNED,
        dueDate: daysFromNow(15),
        projectId: projects[2].id
      }
    ]
  });

  await prisma.risk.createMany({
    data: [
      {
        title: "CRM data migration scope",
        summary: "Legacy customer notes contain inconsistent date formats and owner mappings.",
        status: RiskStatus.WATCHING,
        impact: RiskImpact.HIGH,
        probability: 55,
        mitigation: "Run a dry import on the top 500 accounts and document rejected rows.",
        projectId: projects[0].id,
        ownerId: engineer.id
      },
      {
        title: "Warehouse stakeholder drift",
        summary: "Operations and procurement disagree on the first inventory reporting cut.",
        status: RiskStatus.OPEN,
        impact: RiskImpact.MEDIUM,
        probability: 62,
        mitigation: "Schedule a decision workshop and record a one-page working agreement.",
        projectId: projects[1].id,
        ownerId: manager.id
      },
      {
        title: "Checkout event naming",
        summary: "Campaign and analytics teams use different names for the same checkout steps.",
        status: RiskStatus.OPEN,
        impact: RiskImpact.CRITICAL,
        probability: 48,
        mitigation: "Create an event dictionary and block QA until tracking names are approved.",
        projectId: projects[2].id,
        ownerId: owner.id
      },
      {
        title: "Portal support ownership",
        summary: "The support handoff is complete but escalation ownership still needs a named backup.",
        status: RiskStatus.MITIGATED,
        impact: RiskImpact.LOW,
        probability: 20,
        mitigation: "Add backup owner to the release checklist and support rotation.",
        projectId: projects[3].id,
        ownerId: manager.id
      }
    ]
  });

  await prisma.timeEntry.createMany({
    data: [
      { date: daysFromNow(-4), minutes: 180, note: "Built customer health query and response mapper.", billable: true, taskId: tasks[1].id, userId: engineer.id },
      { date: daysFromNow(-3), minutes: 120, note: "Reviewed CRM timeline states with design.", billable: true, taskId: tasks[2].id, userId: designer.id },
      { date: daysFromNow(-3), minutes: 90, note: "Prepared inventory discovery agenda.", billable: true, taskId: tasks[3].id, userId: manager.id },
      { date: daysFromNow(-2), minutes: 210, note: "Implemented checkout analytics model spike.", billable: true, taskId: tasks[5].id, userId: engineer.id },
      { date: daysFromNow(-2), minutes: 75, note: "Internal QA review for subscription landing blocks.", billable: false, taskId: tasks[6].id, userId: designer.id },
      { date: daysFromNow(-1), minutes: 135, note: "Campaign calendar review and budget label cleanup.", billable: true, taskId: tasks[7].id, userId: manager.id },
      { date: daysFromNow(-1), minutes: 60, note: "Beacon support handoff notes.", billable: true, taskId: tasks[8].id, userId: owner.id }
    ]
  });

  await prisma.projectNote.createMany({
    data: [
      {
        title: "Pulse CRM walkthrough angle",
        body: "Lead with the account timeline, then show how next action suggestions reduce sales admin work.",
        pinned: true,
        projectId: projects[0].id,
        authorId: owner.id
      },
      {
        title: "Inventory workshop constraints",
        body: "Keep discovery focused on supplier risk, reorder thresholds, and CSV import quality.",
        pinned: true,
        projectId: projects[1].id,
        authorId: manager.id
      },
      {
        title: "Commerce QA watchlist",
        body: "Analytics, subscription rules, payment edge cases, and promotion stacking need a joined QA pass.",
        pinned: false,
        projectId: projects[2].id,
        authorId: designer.id
      },
      {
        title: "Beacon release memory",
        body: "The advisor notes export was the most sensitive workflow. Keep it covered in regression checks.",
        pinned: false,
        projectId: projects[3].id,
        authorId: manager.id
      }
    ]
  });

  await prisma.activity.createMany({
    data: [
      { type: "PROJECT_CREATED", message: "Created Pulse CRM workspace", userId: owner.id, projectId: projects[0].id },
      { type: "TASK_MOVED", message: "Moved Design activity timeline to review", userId: designer.id, projectId: projects[0].id, taskId: tasks[2].id },
      { type: "TASK_UPDATED", message: "Raised Checkout analytics model to urgent priority", userId: engineer.id, projectId: projects[2].id, taskId: tasks[5].id },
      { type: "PROJECT_SHIPPED", message: "Shipped Beacon Portal to production", userId: manager.id, projectId: projects[3].id },
      { type: "COMMENT_ADDED", message: "Added implementation notes to Supplier risk matrix", userId: manager.id, projectId: projects[1].id, taskId: tasks[3].id }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded LaunchPad workspace data.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
