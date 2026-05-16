import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  exercise as exerciseSchema,
  moduleGroupFrontmatter,
  type ModuleGroupDetail,
  type ModuleGroupSummary,
  type ModuleGroupTest,
  type ModuleDetail,
} from "@app/shared";
import { z } from "zod";
import { loadAllModules, toSummary } from "./loader.js";

const groupTestSchema = z.object({
  exercises: z.array(exerciseSchema),
});

/**
 * Pull the "Quick Summary" section from a module's MDX body.
 * Returns null if the section isn't found or is empty.
 */
function extractQuickSummary(body: string): string | null {
  const match = body.match(
    /^##\s+Quick\s+Summary\s*$([\s\S]*?)(?=^##\s+|\Z)/m,
  );
  if (!match) return null;
  const content = match[1]?.trim();
  return content && content.length > 0 ? content : null;
}

async function readGroupBody(
  groupDir: string,
  slug: string,
): Promise<{ frontmatter: ReturnType<typeof moduleGroupFrontmatter.parse>; body: string }> {
  const mdxPath = path.join(groupDir, `${slug}.mdx`);
  const raw = await fs.readFile(mdxPath, "utf-8");
  const parsed = matter(raw);
  const frontmatter = moduleGroupFrontmatter.parse({ ...parsed.data, slug });
  return { frontmatter, body: parsed.content };
}

async function loadGroupTest(
  groupDir: string,
  slug: string,
): Promise<ModuleGroupTest | null> {
  const testPath = path.join(groupDir, `${slug}.test.json`);
  try {
    const raw = await fs.readFile(testPath, "utf-8");
    const parsed = groupTestSchema.parse(JSON.parse(raw));
    if (parsed.exercises.length === 0) return null;
    return { slug: slug as ModuleGroupTest["slug"], title: "", exercises: parsed.exercises };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function loadAllGroups(
  groupDir: string,
  contentDir: string,
): Promise<ModuleGroupSummary[]> {
  const entries = await fs.readdir(groupDir, { withFileTypes: true });
  const slugs = entries
    .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
    .map((e) => e.name.replace(/\.mdx$/, ""));

  const allModules = await loadAllModules(contentDir);

  const groups = await Promise.all(
    slugs.map(async (s) => {
      const { frontmatter } = await readGroupBody(groupDir, s);
      const test = await loadGroupTest(groupDir, s);
      const members = allModules.filter((m) => m.group === frontmatter.slug);
      return {
        ...frontmatter,
        moduleCount: members.length,
        hasTest: test != null,
      } satisfies ModuleGroupSummary;
    }),
  );

  return groups.sort((a, b) => a.order - b.order);
}

export async function loadGroup(
  groupDir: string,
  contentDir: string,
  slug: string,
): Promise<ModuleGroupDetail> {
  const { frontmatter, body } = await readGroupBody(groupDir, slug);
  const allModules = await loadAllModules(contentDir);
  const members: ModuleDetail[] = allModules.filter(
    (m) => m.group === frontmatter.slug,
  );

  const autoSummary = members.map((m) => ({
    slug: m.slug,
    title: m.title,
    summary: extractQuickSummary(m.body),
  }));

  const test = await loadGroupTest(groupDir, slug);

  return {
    ...frontmatter,
    moduleCount: members.length,
    hasTest: test != null,
    body,
    autoSummary,
    modules: members.map(toSummary),
    testExerciseCount: test?.exercises.length ?? 0,
  };
}

export async function loadGroupTestExercises(
  groupDir: string,
  slug: string,
): Promise<ModuleGroupTest | null> {
  return loadGroupTest(groupDir, slug);
}

export async function loadMasterGroupTest(
  groupDir: string,
  masterSlug: string,
): Promise<ModuleGroupTest | null> {
  const testPath = path.join(groupDir, `${masterSlug}.master.test.json`);
  try {
    const raw = await fs.readFile(testPath, "utf-8");
    const parsed = groupTestSchema.parse(JSON.parse(raw));
    if (parsed.exercises.length === 0) return null;
    return { slug: masterSlug, title: "", exercises: parsed.exercises };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
