import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type PublicRelease,
  type PublicReleaseEntry,
  type PublicReleaseKnownSectionId,
  type PublicReleaseSection,
  type PublicReleaseSectionId,
} from '../src/lib/publicReleaseTypes';

const RELEASE_HEADING_RE = /^## \[(?<version>[^\]]+)\](?: - (?<date>[^\n]+))?\s*$/gm;
const SECTION_HEADING_RE = /^### (?<label>[^\n]+)\s*$/;
const ISSUE_REF_RE = /#\d+/g;
const PUBLIC_RELEASES_CHANGELOG_PATH = join(process.cwd(), 'CHANGELOG.md');

const SECTION_IDS_BY_LABEL: Record<string, PublicReleaseKnownSectionId> = {
  added: 'added',
  changed: 'changed',
  deprecated: 'deprecated',
  removed: 'removed',
  fixed: 'fixed',
  security: 'security',
};

const HARD_INTERNAL_TITLE_PATTERNS = [
  /^(?:playwright|e2e|vitest|cloud agent|cursor|codeql)\b/i,
  /^(?:actions\/|@[\w.-]+\/[\w.-]+|tailwindcss|typescript-eslint|vitest-coverage-report-action)\b/i,
  /\btests?\b/i,
];

const HARD_INTERNAL_BODY_PATTERNS = [
  /\b(?:release metadata|npm ci|runbook|workflow artifacts?|github actions?)\b/i,
  /\b(?:fixture|fixtures|seed|seeds|harness)\b/i,
];

const SOFT_INTERNAL_PATTERNS = [
  /\bdependabot\b/i,
  /\b(?:lint|eslint|markdownlint|actionlint|fallow)\b/i,
  /\b(?:ci|test(?:s|ing)?|queryclient|node_modules)\b/i,
  /\b(?:cloud agent|cursor|runbook|workflow|preview release-metadata)\b/i,
];

const USER_FACING_PATTERNS = [
  /\baudit log\b/i,
  /\bauth\b/i,
  /\bavatar\b/i,
  /\bbanner\b/i,
  /\bcookie consent\b/i,
  /\bdashboard\b/i,
  /\bdetails\b/i,
  /\bequipment\b/i,
  /\bexport\b/i,
  /\bfleet\b/i,
  /\bfooter\b/i,
  /\bgoogle\b/i,
  /\bheader\b/i,
  /\bhomepage\b/i,
  /\binventory\b/i,
  /\blanding\b/i,
  /\blogin\b/i,
  /\bmobile\b/i,
  /\bnotification\b/i,
  /\boperator\b/i,
  /\bpage\b/i,
  /\bprivacy\b/i,
  /\bpublic\b/i,
  /\bquick form\b/i,
  /\bquickbooks\b/i,
  /\bqr\b/i,
  /\bright to repair\b/i,
  /\bscanner\b/i,
  /\bsign(?:-| )?in\b/i,
  /\bsign(?:-| )?up\b/i,
  /\bstatus\b/i,
  /\bteam\b/i,
  /\btimeline\b/i,
  /\btopbar\b/i,
  /\bwork order\b/i,
];

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\([^)]+\)/g;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(MARKDOWN_LINK_RE, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\\([[\]()_*`])/g, '$1');
}

function cleanDisplayText(text: string): string {
  return normalizeWhitespace(
    stripInlineMarkdown(text)
      .replace(/\((?:#\d+(?:,\s*#\d+)*)\)/g, '')
      .replace(ISSUE_REF_RE, '')
      .replace(/\s+([,.;:!?])/g, '$1'),
  );
}

function extractIssueRefs(text: string): readonly string[] {
  return [...new Set([...text.matchAll(ISSUE_REF_RE)].map((match) => match[0]))];
}

function resolveSectionId(label: string): PublicReleaseSectionId {
  const known = SECTION_IDS_BY_LABEL[label.toLowerCase()];
  if (known) {
    return known;
  }

  return label.trim().toLowerCase().replace(/\s+/g, '-');
}

function isUserFacing(text: string): boolean {
  return USER_FACING_PATTERNS.some((pattern) => pattern.test(text));
}

function shouldOmitEntry(title: string | null, body: string, sectionId: PublicReleaseSectionId): boolean {
  if (sectionId === 'security') {
    return false;
  }

  const titleText = title ?? '';
  const combined = `${titleText} ${body}`.trim();
  const hardInternalTitle = HARD_INTERNAL_TITLE_PATTERNS.some((pattern) => pattern.test(titleText));
  const hardInternalBody = HARD_INTERNAL_BODY_PATTERNS.some((pattern) => pattern.test(combined));
  const hardInternal = hardInternalTitle || hardInternalBody;

  if (hardInternalTitle && !isUserFacing(combined)) {
    return true;
  }

  if (hardInternalBody && !isUserFacing(combined)) {
    return true;
  }

  if (!hardInternal && isUserFacing(combined)) {
    return false;
  }

  const softInternalMatches = SOFT_INTERNAL_PATTERNS.filter((pattern) => pattern.test(combined)).length;
  const userFacingMatches = USER_FACING_PATTERNS.filter((pattern) => pattern.test(combined)).length;

  return softInternalMatches >= 2 && userFacingMatches === 0;
}

function parseEntry(rawBullet: string, sectionId: PublicReleaseSectionId): PublicReleaseEntry | null {
  const normalizedRaw = normalizeWhitespace(rawBullet);
  if (!normalizedRaw) {
    return null;
  }

  const issueRefs = extractIssueRefs(normalizedRaw);
  const titleAndBody = normalizedRaw.replace(/\s+/g, ' ').trim();
  const boldMatch = titleAndBody.match(/^\*\*(.+?)\*\*(?:\s+[—–-]\s+)?(.*)$/);
  const dashedText = boldMatch
    ? {
        title: cleanDisplayText(boldMatch[1]),
        body: cleanDisplayText(boldMatch[2]),
      }
    : (() => {
        const cleaned = cleanDisplayText(titleAndBody);
        const dashedMatch = cleaned.match(/^(?<title>.+?)\s+[—–-]\s+(?<body>.+)$/);
        if (!dashedMatch?.groups) {
          return { title: null, body: cleaned };
        }

        return {
          title: dashedMatch.groups.title.trim(),
          body: dashedMatch.groups.body.trim(),
        };
      })();

  const title = dashedText.title && dashedText.title.length > 0 ? dashedText.title : null;
  const body = dashedText.body;
  if (!title && !body) {
    return null;
  }

  if (shouldOmitEntry(title, body, sectionId)) {
    return null;
  }

  return {
    title,
    body,
    issueRefs,
  };
}

function parseSection(sectionLabel: string, bulletLines: readonly string[]): PublicReleaseSection | null {
  const id = resolveSectionId(sectionLabel);
  const entries = bulletLines
    .map((bullet) => parseEntry(bullet, id))
    .filter((entry): entry is PublicReleaseEntry => entry !== null);

  if (entries.length === 0) {
    return null;
  }

  return {
    id,
    label: sectionLabel,
    entries,
  };
}

function parseReleaseBody(markdown: string): readonly PublicReleaseSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: PublicReleaseSection[] = [];
  let currentSectionLabel: string | null = null;
  let currentBullets: string[] = [];
  let currentBulletLines: string[] = [];

  const flushBullet = () => {
    if (currentBulletLines.length === 0) {
      return;
    }

    currentBullets.push(normalizeWhitespace(currentBulletLines.join(' ')));
    currentBulletLines = [];
  };

  const flushSection = () => {
    flushBullet();
    if (!currentSectionLabel) {
      currentBullets = [];
      return;
    }

    const section = parseSection(currentSectionLabel, currentBullets);
    if (section) {
      sections.push(section);
    }
    currentBullets = [];
  };

  for (const line of lines) {
    const sectionMatch = line.match(SECTION_HEADING_RE);
    if (sectionMatch?.groups?.label) {
      flushSection();
      currentSectionLabel = sectionMatch.groups.label.trim();
      continue;
    }

    if (!currentSectionLabel) {
      continue;
    }

    if (line.startsWith('- ')) {
      flushBullet();
      currentBulletLines = [line.slice(2).trim()];
      continue;
    }

    if (line.trim().length === 0) {
      flushBullet();
      continue;
    }

    if (currentBulletLines.length > 0) {
      currentBulletLines.push(line.trim());
    }
  }

  flushSection();
  return sections;
}

export function parsePublicReleases(markdown: string): readonly PublicRelease[] {
  const headings = [...markdown.matchAll(RELEASE_HEADING_RE)];
  const releases: PublicRelease[] = [];

  for (let index = 0; index < headings.length; index += 1) {
    const match = headings[index];
    const version = match.groups?.version?.trim();
    if (!version || version.toLowerCase() === 'unreleased') {
      continue;
    }

    const date = match.groups?.date?.trim() ?? '';
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = headings[index + 1]?.index ?? markdown.length;
    const body = markdown.slice(bodyStart, bodyEnd).trim();

    releases.push({
      version,
      date,
      isLatest: releases.length === 0,
      sections: parseReleaseBody(body),
    });
  }

  if (releases.length === 0) {
    throw new Error(
      'Unable to extract any released sections from CHANGELOG.md. Public releases page data cannot be generated.',
    );
  }

  if (releases[0].sections.length === 0) {
    throw new Error(
      `Unable to extract customer-facing notes for the latest released section (${releases[0].version}).`,
    );
  }

  return releases;
}

export function loadPublicReleases(changelogPath: string = PUBLIC_RELEASES_CHANGELOG_PATH): readonly PublicRelease[] {
  const markdown = readFileSync(changelogPath, 'utf-8');
  return parsePublicReleases(markdown);
}
