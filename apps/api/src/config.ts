import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 4000),
  contentDir: path.resolve(
    __dirname,
    "..",
    process.env.CONTENT_DIR ?? "../../content/modules",
  ),
  referenceDir: path.resolve(
    __dirname,
    "..",
    process.env.REFERENCE_DIR ?? "../../content/references",
  ),
  groupDir: path.resolve(
    __dirname,
    "..",
    process.env.GROUP_DIR ?? "../../content/groups",
  ),
};
