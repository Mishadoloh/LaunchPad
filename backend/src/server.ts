import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { operationsRouter } from "./routes/operations.routes.js";
import { projectRouter } from "./routes/project.routes.js";
import { taskRouter } from "./routes/task.routes.js";
import { teamRouter } from "./routes/team.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.type("html").send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>LaunchPad API</title>
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; background: #f5f6f2; color: #202421; }
          main { max-width: 920px; margin: 0 auto; padding: 48px 24px; }
          h1 { font-size: 48px; line-height: 1; margin: 0 0 12px; }
          p { color: #65706a; font-size: 18px; }
          section { display: grid; gap: 10px; margin-top: 28px; }
          a { display: block; padding: 14px 16px; border: 1px solid #dfe4dd; border-radius: 8px; background: #fff; color: #26312c; text-decoration: none; font-weight: 800; }
          code { color: #2f7d58; }
        </style>
      </head>
      <body>
        <main>
          <h1>LaunchPad API</h1>
          <p>Backend is running on <code>localhost:${env.PORT}</code>. Open the React app at <code>http://localhost:5174</code>.</p>
          <section>
            <a href="/api/health">GET /api/health</a>
            <a href="/api/dashboard">GET /api/dashboard</a>
            <a href="/api/operations">GET /api/operations</a>
            <a href="/api/projects">GET /api/projects</a>
            <a href="/api/tasks">GET /api/tasks</a>
            <a href="/api/team">GET /api/team</a>
          </section>
        </main>
      </body>
    </html>
  `);
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "launchpad-api",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/projects", projectRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/team", teamRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`LaunchPad API listening on http://localhost:${env.PORT}`);
});
