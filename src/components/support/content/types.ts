import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Personas that EquipQR support documentation serves. `all` is used for articles
 * that apply to every user regardless of role (example: "what's the status page").
 */
export type SupportPersona =
  | "technician"
  | "requestor"
  | "manager"
  | "admin"
  | "owner"
  | "all";

/**
 * Top-level categories for the support library. Categories map 1:1 to the
 * tabs/sections in the Support page navigation.
 */
export type SupportCategoryId =
  | "start-here"
  | "technician-field-work"
  | "work-orders"
  | "equipment-qr"
  | "inventory-parts"
  | "teams-roles"
  | "admin-integrations"
  | "privacy-support";

export interface SupportCategory {
  id: SupportCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

export interface SupportPersonaMeta {
  id: SupportPersona;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * A screenshot attached to a step. The path is relative to the `public/`
 * directory (served at `/`) or an absolute docs asset path. The loader renders
 * the image when the asset is resolvable and falls back to a descriptive
 * placeholder when it is missing, so missing screenshots never block the docs.
 */
export interface SupportScreenshot {
  /** Absolute served path, e.g. `/docs/support/technician/qr-scan/step-01.png`. */
  src: string;
  /** Accessible description of what the screenshot shows. */
  alt: string;
  /** Optional caption displayed below the image. */
  caption?: string;
  /** Optional viewport tag so mobile/desktop captures are obvious. */
  viewport?: "mobile" | "desktop";
}

export interface SupportStep {
  /** Short imperative title, e.g. "Open the Equipment page". */
  title: string;
  /** Body content. Plain text or JSX for inline emphasis and badges. */
  description: ReactNode;
  /** Optional inline note for gotchas, permissions, or tips. */
  note?: ReactNode;
  /** Optional screenshot demonstrating the step. */
  screenshot?: SupportScreenshot;
}

export interface SupportArticleRelated {
  id: string;
  label: string;
}

export interface SupportArticle {
  /** Stable identifier used for deep-links and cross-references. */
  id: string;
  /** Title shown in article headers and listings. */
  title: string;
  /** One-line summary for listings and search. */
  summary: string;
  category: SupportCategoryId;
  /** Personas this article is primarily intended for. */
  personas: SupportPersona[];
  /** Optional plain-language prerequisite (role, feature flag, setup). */
  requirement?: string;
  /** Optional introductory content shown above the steps. */
  intro?: ReactNode;
  /** Numbered steps to complete the workflow. */
  steps: SupportStep[];
  /** Optional closing content shown below the steps. */
  outro?: ReactNode;
  /** Related articles for cross-linking. */
  related?: SupportArticleRelated[];
  /** ISO-8601 date (YYYY-MM-DD) of the last content review. */
  lastReviewed: string;
  /** Mark the article as dashboard-only; it will not render on /support. */
  dashboardOnly?: boolean;
}
