import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  referenceFrontmatter,
  type ReferenceDetail,
  type ReferenceSummary,
} from "@app/shared";

async function loadOne(
  referenceDir: string,
  slug: string,
): Promise<ReferenceDetail> {
  const mdxPath = path.join(referenceDir, `${slug}.mdx`);
  const raw = await fs.readFile(mdxPath, "utf-8");
  const parsed = matter(raw);
  const fm = referenceFrontmatter.parse({ ...parsed.data, slug });
  return { ...fm, body: parsed.content };
}

export async function loadAllReferences(
  referenceDir: string,
): Promise<ReferenceDetail[]> {
  const entries = await fs.readdir(referenceDir, { withFileTypes: true });
  const slugs = entries
    .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
    .map((e) => e.name.replace(/\.mdx$/, ""));
  const refs = await Promise.all(slugs.map((s) => loadOne(referenceDir, s)));
  return refs.sort((a, b) => a.order - b.order);
}

export async function loadReference(
  referenceDir: string,
  slug: string,
): Promise<ReferenceDetail> {
  return loadOne(referenceDir, slug);
}

export function toReferenceSummary(r: ReferenceDetail): ReferenceSummary {
  const { body: _b, ...rest } = r;
  return rest;
}
