import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { config } from "./config.js";
import { modulesRouter } from "./routes/modules.js";
import { attemptsRouter } from "./routes/attempts.js";
import { progressRouter } from "./routes/progress.js";
import { referencesRouter } from "./routes/references.js";
import { groupsRouter } from "./routes/groups.js";
import { authRouter } from "./routes/auth.js";
import { resolveUser } from "./middleware/auth.js";
import { mockTestsRouter } from "./routes/mock-tests.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(resolveUser);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);

// Static content routes — cache for 5 minutes in the browser, 1 hour on CDN/proxy.
// Content only changes on deploy (process restart clears the in-memory cache too).
const CONTENT_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=60";
app.use("/modules", (_req, res, next) => { res.setHeader("Cache-Control", CONTENT_CACHE); next(); }, modulesRouter);
app.use("/references", (_req, res, next) => { res.setHeader("Cache-Control", CONTENT_CACHE); next(); }, referencesRouter);
app.use("/groups", (_req, res, next) => { res.setHeader("Cache-Control", CONTENT_CACHE); next(); }, groupsRouter);

// Progress and attempts are user-specific and must never be cached.
app.use("/attempts", attemptsRouter);
app.use("/progress", progressRouter);
// Mock tests change during development — disable cache for now
app.use("/mock-tests", (_req, res, next) => { res.setHeader("Cache-Control", "no-store, must-revalidate"); next(); }, mockTestsRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "ValidationError", issues: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "InternalServerError", message: err.message });
};
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Content dir: ${config.contentDir}`);
});
