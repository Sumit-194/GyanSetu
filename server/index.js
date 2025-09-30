import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { teachersRouter } from "./routes/teachers.js";
import requestsRouter from "./routes/requests.js";
import groupsRouter from "./routes/groups.js";
import demoUsersRouter from "./routes/demoUsers.js";
import notificationsRouter from "./routes/notifications.js";

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger for debugging
  app.use((req, _res, next) => {
    try {
      console.debug(`[server] ${req.method} ${req.originalUrl}`);
    } catch (e) {}
    next();
  });

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/teachers", teachersRouter);
  app.use("/api/requests", requestsRouter);
  app.use("/api/groups", groupsRouter);
  app.use("/api/notifications", notificationsRouter);
  // Demo/testing helpers (only enabled in non-production or when ALLOW_DEMO=1)
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO) {
    app.use("/api/demo", demoUsersRouter);
  }

  // Log available routes for debugging
  try {
    const routes = [];
    app._router && app._router.stack.forEach((r) => {
      if (r.route && r.route.path) {
        const methods = r.route.methods ? Object.keys(r.route.methods).join(",") : "";
        routes.push(`${methods.toUpperCase()} ${r.route.path}`);
      }
    });
    console.debug("Express routes:", routes);
  } catch (e) {
    console.debug("Unable to list routes", e);
  }

  return app;
}
