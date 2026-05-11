import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { config } from "./config.js";
import { modulesRouter } from "./routes/modules.js";
import { attemptsRouter } from "./routes/attempts.js";
import { progressRouter } from "./routes/progress.js";
import { referencesRouter } from "./routes/references.js";
import { groupsRouter } from "./routes/groups.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/modules", modulesRouter);
app.use("/attempts", attemptsRouter);
app.use("/progress", progressRouter);
app.use("/references", referencesRouter);
app.use("/groups", groupsRouter);

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
