/**
 * One-time migration: in-app SupportArticle TSX → VitePress markdown under docs/support/.
 * Run: npx tsx scripts/migrate-support-to-vitepress.ts
 */
import React from "react";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import type {
  SupportArticle,
  SupportCategoryId,
  SupportPersona,
  SupportStep,
} from "../src/components/support/content/types";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { SUPPORT_ARTICLES } = await import(
  "../src/components/support/content/articles/index"
);
const { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_ORDER } = await import(
  "../src/components/support/content/taxonomy"
);

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsSupportRoot = join(repoRoot, "docs", "support");

const APP_SUPPORT_URL = "https://equipqr.app/dashboard/support";

function isElement(
  node: unknown,
): node is { type: string | { displayName?: string }; props: { children?: ReactNode } } {
  return typeof node === "object" && node !== null && "type" in node && "props" in node;
}

function elementTag(node: { type: unknown }): string | null {
  if (typeof node.type === "string") return node.type;
  if (typeof node.type === "function") {
    const fn = node.type as { displayName?: string; name?: string };
    return fn.displayName ?? fn.name ?? null;
  }
  return null;
}

function nodeToMarkdown(node: ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToMarkdown).join("");

  if (!isElement(node)) return "";

  const tag = elementTag(node);
  const children = node.props.children;
  const inner = nodeToMarkdown(children);

  switch (tag) {
    case "p":
      return `${inner.trim()}\n\n`;
    case "strong":
      return `**${inner.trim()}**`;
    case "em":
      return `*${inner.trim()}*`;
    case "code":
      return `\`${inner.trim()}\``;
    case "ul":
      return `${inner}\n`;
    case "ol":
      return `${inner}\n`;
    case "li": {
      const parentIsOrdered = false;
      const prefix = parentIsOrdered ? "1. " : "- ";
      return `${prefix}${inner.trim()}\n`;
    }
    case "a": {
      const href = (node.props as { href?: string }).href ?? "#";
      return `[${inner.trim()}](${href})`;
    }
    case "div":
    case "span":
      return inner;
    case "table":
      return convertTable(node);
    default:
      return inner;
  }
}

function convertTable(node: {
  props: { children?: ReactNode };
}): string {
  const children = node.props.children;
  if (!Array.isArray(children)) return nodeToMarkdown(children);

  const rows: string[][] = [];
  for (const section of children) {
    if (!isElement(section)) continue;
    const sectionTag = elementTag(section);
    if (sectionTag !== "thead" && sectionTag !== "tbody") continue;
    const sectionChildren = section.props.children;
    const trList = Array.isArray(sectionChildren)
      ? sectionChildren
      : [sectionChildren];
    for (const tr of trList) {
      if (!isElement(tr) || elementTag(tr) !== "tr") continue;
      const cells: string[] = [];
      const tdList = Array.isArray(tr.props.children)
        ? tr.props.children
        : [tr.props.children];
      for (const cell of tdList) {
        if (!isElement(cell)) continue;
        cells.push(nodeToMarkdown(cell.props.children).trim().replace(/\n/g, " "));
      }
      if (cells.length) rows.push(cells);
    }
  }
  if (rows.length === 0) return "";

  const header = rows[0];
  const body = rows.slice(1);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ];
  return `${lines.join("\n")}\n\n`;
}

function formatPersonas(personas: SupportPersona[]): string {
  const labels: Record<SupportPersona, string> = {
    all: "Everyone",
    technician: "Technician",
    requestor: "Requestor",
    manager: "Manager",
    admin: "Admin",
    owner: "Owner",
  };
  return personas.map((p) => labels[p]).join(", ");
}

function screenshotBlock(_step: SupportStep, _stepIndex: number): string {
  // Screenshots are omitted until PNGs exist under docs/public/support/.
  return "";
}

function articleFrontmatter(article: SupportArticle): string {
  const lines = [
    "---",
    `title: ${JSON.stringify(article.title)}`,
    `description: ${JSON.stringify(article.summary)}`,
    `lastReviewed: ${article.lastReviewed}`,
    `personas: ${JSON.stringify(article.personas)}`,
  ];
  if (article.requirement) {
    lines.push(`requirement: ${JSON.stringify(article.requirement)}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

function renderArticleMarkdown(article: SupportArticle): string {
  const parts: string[] = [articleFrontmatter(article)];

  parts.push(`**For:** ${formatPersonas(article.personas)}  `);
  parts.push(`**Last reviewed:** ${article.lastReviewed}`);

  if (article.requirement) {
    parts.push("", `::: info Requires`, article.requirement, `:::`, "");
  }

  if (article.dashboardOnly) {
    parts.push(
      "",
      `::: tip In the EquipQR app`,
      `This workflow runs on the signed-in support page: [${APP_SUPPORT_URL}](${APP_SUPPORT_URL}).`,
      `:::`, 
      "",
    );
  }

  if (article.intro) {
    parts.push(nodeToMarkdown(article.intro).trim(), "");
  }

  article.steps.forEach((step, index) => {
    parts.push(`## ${index + 1}. ${step.title}`, "");
    parts.push(nodeToMarkdown(step.description).trim());
    if (step.note) {
      parts.push("", `::: tip Note`, nodeToMarkdown(step.note).trim(), `:::`, "");
    }
    parts.push(screenshotBlock(step, index + 1));
  });

  if (article.outro) {
    parts.push(nodeToMarkdown(article.outro).trim(), "");
  }

  if (article.related?.length) {
    parts.push("## Related articles", "");
    for (const rel of article.related) {
      const target = SUPPORT_ARTICLES.find((a) => a.id === rel.id);
      const cat = target?.category ?? article.category;
      const href =
        cat === article.category ? `./${rel.id}` : `../${cat}/${rel.id}`;
      parts.push(`- [${rel.label}](${href})`);
    }
    parts.push("");
  }

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function categoryIndexMarkdown(categoryId: SupportCategoryId, articles: SupportArticle[]): string {
  const meta = SUPPORT_CATEGORIES[categoryId];
  const lines = [
    "---",
    `title: ${JSON.stringify(meta.label)}`,
    `description: ${JSON.stringify(meta.description)}`,
    "---",
    "",
    `# ${meta.label}`,
    "",
    meta.description,
    "",
    "## Articles",
    "",
  ];
  for (const article of articles) {
    lines.push(`- [${article.title}](./${article.id}) — ${article.summary}`);
  }
  lines.push("");
  return lines.join("\n");
}

function supportHomeMarkdown(): string {
  const lines = [
    "---",
    'title: "EquipQR Help Center"',
    'description: "Step-by-step guides for technicians, managers, admins, and equipment owners using EquipQR."',
    "---",
    "",
    "# EquipQR Help Center",
    "",
    "Browse guides by workflow and role. For bug reports and ticket tracking, use the signed-in support page in the app.",
    "",
    `- [Open support & tickets](${APP_SUPPORT_URL})`,
    "- [System status](https://status.equipqr.app)",
    "- [Open EquipQR](https://equipqr.app)",
    "",
    "## Categories",
    "",
  ];
  for (const id of SUPPORT_CATEGORY_ORDER) {
    const meta = SUPPORT_CATEGORIES[id];
    lines.push(`- [${meta.label}](./${id}/) — ${meta.description}`);
  }
  lines.push(
    "",
    "## More resources",
    "",
    "- [Permissions (RBAC)](/guides/permissions)",
    "- [Work order workflows](/guides/workflows)",
    "- [Technician image upload](/how-to/image-upload/technician-image-upload-guide)",
    "- [QuickBooks integration](/integrations/quickbooks)",
    "- [PM checklist templates](/pm-templates/)",
    "",
  );
  return lines.join("\n");
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function writeArticleFiles(): void {
  ensureDir(docsSupportRoot);
  writeFileSync(join(docsSupportRoot, "index.md"), supportHomeMarkdown(), "utf8");

  const byCategory = new Map<SupportCategoryId, SupportArticle[]>();
  for (const article of SUPPORT_ARTICLES) {
    if (article.dashboardOnly) continue;
    const list = byCategory.get(article.category) ?? [];
    list.push(article);
    byCategory.set(article.category, list);
  }

  const dashboardOnly = SUPPORT_ARTICLES.filter((a) => a.dashboardOnly);

  for (const categoryId of SUPPORT_CATEGORY_ORDER) {
    const catDir = join(docsSupportRoot, categoryId);
    ensureDir(catDir);
    const articles = byCategory.get(categoryId) ?? [];
    writeFileSync(
      join(catDir, "index.md"),
      categoryIndexMarkdown(categoryId, articles),
      "utf8",
    );
    for (const article of articles) {
      writeFileSync(join(catDir, `${article.id}.md`), renderArticleMarkdown(article), "utf8");
    }
  }

  const privacyDir = join(docsSupportRoot, "privacy-support");
  for (const article of dashboardOnly) {
    writeFileSync(join(privacyDir, `${article.id}.md`), renderArticleMarkdown(article), "utf8");
  }

  const privacyArticles = [
    ...(byCategory.get("privacy-support") ?? []),
    ...dashboardOnly,
  ];
  writeFileSync(
    join(privacyDir, "index.md"),
    categoryIndexMarkdown("privacy-support", privacyArticles),
    "utf8",
  );

  console.log(
    `Wrote ${SUPPORT_ARTICLES.length} articles under ${docsSupportRoot.replace(repoRoot, "")}`,
  );
}

await writeArticleFiles();
