// Issue triage and comment automation for EquipQR.
// Loaded by issue-triage.yml and issue-comment-handler.yml through actions/github-script.
// Tested by issue-automation.test.js (node --test .github/scripts/issue-automation.test.js).
//
// Every write is idempotent: adding a label that is already present, removing one
// that is missing, or creating a label that already exists never fails the run.

/** @typedef {{ name: string, color: string, description: string }} LabelDefinition */

/** @type {Record<string, LabelDefinition>} */
export const LABELS = {
  'area:database': { name: 'area:database', color: '1d76db', description: 'Supabase, migrations, RLS, schema, database functions' },
  'area:work-orders': { name: 'area:work-orders', color: '1d76db', description: 'Work orders, PM checklists, scheduling' },
  'area:fleet-map': { name: 'area:fleet-map', color: '1d76db', description: 'Fleet map, locations, GPS' },
  'area:equipment': { name: 'area:equipment', color: '1d76db', description: 'Equipment records, QR codes, asset tags' },
  'area:billing': { name: 'area:billing', color: '1d76db', description: 'Stripe, invoices, subscriptions' },
  'area:ci': { name: 'area:ci', color: '1d76db', description: 'Vitest, Playwright, GitHub Actions, migration validator' },
  'status:needs-info': { name: 'status:needs-info', color: 'd93f0b', description: 'Waiting on the reporter for reproduction steps or logs' },
  'status:needs-triage': { name: 'status:needs-triage', color: 'fbca04', description: 'Ready for maintainer triage' },
  'status:needs-investigation': { name: 'status:needs-investigation', color: 'c5def5', description: 'Root cause unknown; needs investigation' },
  'status:ready-for-dev': { name: 'status:ready-for-dev', color: '0e8a16', description: 'Triaged and ready to be picked up' },
  'status:in-progress': { name: 'status:in-progress', color: '5319e7', description: 'Actively being worked on' },
  'status:blocked': { name: 'status:blocked', color: 'b60205', description: 'Blocked by an external dependency' },
};

/** Labels that must never be present on a freshly opened issue. */
const FORBIDDEN_ON_OPEN = ['status:in-progress', 'status:blocked'];

/** Hidden marker that identifies the bot's needs-info checklist comment. */
export const NEEDS_INFO_MARKER = '<!-- equipqr-issue-triage:needs-info -->';

/** Repository permission levels allowed to run slash commands. */
const MAINTAINER_PERMISSIONS = new Set(['admin', 'maintain', 'write']);

/** @type {{ label: string, patterns: RegExp[] }[]} */
const AREA_RULES = [
  {
    label: 'area:database',
    patterns: [
      /\bsupabase\b/i,
      /\bmigrations?\b/i,
      /\brls\b/i,
      /\brow[- ]level security\b/i,
      /\bschemas?\b/i,
      /\bpostgres(?:ql)?\b/i,
      /\b(?:edge|database|db|sql|postgres) functions?\b/i,
      /\brpc\b/i,
      /supabase\/(?:migrations|functions)\b/i,
    ],
  },
  {
    label: 'area:work-orders',
    patterns: [
      /\bwork[- ]?orders?\b/i,
      /\bpm (?:checklists?|templates?)\b/i,
      /\bprevent(?:at)?ive maintenance\b/i,
      /src\/features\/(?:work-orders|pm-templates)\b/i,
    ],
  },
  {
    label: 'area:fleet-map',
    patterns: [
      /\bfleet[- ]?map\b/i,
      /\bmap view\b/i,
      /\bgoogle maps?\b/i,
      /\bgeolocation\b/i,
      /\bgps\b/i,
      /src\/features\/fleet-map\b/i,
    ],
  },
  {
    label: 'area:equipment',
    patterns: [
      /\bequipment\b/i,
      /\bqr(?:[- ]codes?)?\b/i,
      /\basset tags?\b/i,
      /\bforklifts?\b/i,
      /src\/features\/equipment\b/i,
    ],
  },
  {
    label: 'area:billing',
    patterns: [
      /\bstripe\b/i,
      /\binvoices?\b/i,
      /\bsubscriptions?\b/i,
      /\bbilling\b/i,
    ],
  },
  {
    label: 'area:ci',
    patterns: [
      /\bvitest\b/i,
      /\bplaywright\b/i,
      /\bgithub actions?\b/i,
      /\.github\/workflows\b/i,
      /\b(?:ci|e2e)\b/i,
      /\bmigrations? validator\b/i,
      /\bworkflow (?:run|file|job)s?\b/i,
      /\bflaky tests?\b/i,
    ],
  },
];

const NO_RESPONSE = /^_no response_$/i;

/**
 * Splits an issue-form body into `### Heading` sections. Fields left empty in a
 * form render as `_No response_` and are normalized to an empty string.
 * @param {string} body
 * @returns {{ heading: string, content: string }[]}
 */
export function parseFormSections(body) {
  const sections = [];
  const parts = body.split(/^###\s+(.+)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const content = parts[i + 1].trim();
    sections.push({ heading: parts[i].trim(), content: NO_RESPONSE.test(content) ? '' : content });
  }
  return sections;
}

/**
 * Removes `_No response_` placeholders so empty form fields do not count as content.
 * @param {string} body
 */
function stripEmptyResponses(body) {
  return body.replace(/^_no response_$/gim, '');
}

/**
 * @param {string} title
 * @param {string} body
 * @returns {string[]} area labels whose keywords or paths appear in the issue
 */
export function classifyAreas(title, body) {
  const text = `${title}\n${stripEmptyResponses(body)}`;
  return AREA_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map((rule) => rule.label);
}

/**
 * @param {{ title: string, body: string, labels: string[] }} issue
 */
export function isBugReport({ title, body, labels }) {
  if (labels.some((label) => label.toLowerCase() === 'bug')) return true;
  if (/^\s*(?:\[bug\]|bug:)/i.test(title)) return true;
  // Bug report forms always carry a reproduction-steps field.
  return parseFormSections(body).some((section) => /steps to reproduce|reproduction steps/i.test(section.heading));
}

/**
 * @param {string} body
 */
function hasReproductionSteps(body) {
  const sections = parseFormSections(body);
  const reproSection = sections.find((section) => /reproduc|steps/i.test(section.heading));
  if (reproSection) return reproSection.content.length > 0;

  const text = stripEmptyResponses(body);
  if (/(?:steps to reproduce|to reproduce|repro(?:duction)? steps)\s*:?\s*\n+\s*\S/i.test(text)) return true;
  // A numbered list with at least two steps.
  return /^\s*1[.)]\s+\S/m.test(text) && /^\s*2[.)]\s+\S/m.test(text);
}

/**
 * True when the text links a file uploaded to GitHub (screenshots, recordings, logs).
 * @param {string} text
 */
function hasGitHubAttachment(text) {
  for (const candidate of text.match(/https:\/\/[^\s)<>"']+/g) || []) {
    try {
      const url = new URL(candidate);
      if (url.hostname === 'github.com' && url.pathname.startsWith('/user-attachments/')) return true;
    } catch {
      // Not a valid URL; keep looking.
    }
  }
  return false;
}

/**
 * @param {string} body
 */
function hasLogsOrEvidence(body) {
  const sections = parseFormSections(body);
  const logSection = sections.find((section) => /log|error|console|stack|output|screenshot|evidence/i.test(section.heading));
  if (logSection && logSection.content.length > 0) return true;

  // In an issue form, only filled-in field contents count; headings such as
  // "Console error" above an empty field must not read as evidence.
  const text =
    sections.length > 0 ? sections.map((section) => section.content).join('\n') : stripEmptyResponses(body);
  return (
    /```/.test(text) ||
    /!\[[^\]]*\]\([^)]+\)/.test(text) ||
    /<img\s/i.test(text) ||
    hasGitHubAttachment(text) ||
    /\b(?:stack ?trace|traceback|exception|console (?:error|log)|(?:type|reference|syntax)error)\b/i.test(text) ||
    /\berror:/i.test(text) ||
    /\b[45]\d\d (?:error|status|response)\b/i.test(text)
  );
}

/**
 * @param {string} body
 * @returns {('reproduction steps' | 'logs')[]} the context a bug report is missing
 */
export function findMissingBugInfo(body) {
  /** @type {('reproduction steps' | 'logs')[]} */
  const missing = [];
  if (!hasReproductionSteps(body)) missing.push('reproduction steps');
  if (!hasLogsOrEvidence(body)) missing.push('logs');
  return missing;
}

/**
 * @param {('reproduction steps' | 'logs')[]} missing
 */
export function buildNeedsInfoComment(missing) {
  const items = [];
  if (missing.includes('reproduction steps')) {
    items.push('- [ ] **Steps to reproduce**: numbered steps from a fresh page load, including the page URL and your role (owner, admin, member, technician).');
  }
  if (missing.includes('logs')) {
    items.push('- [ ] **Logs or evidence**: browser console errors, the failing network response, or a screenshot or screen recording.');
  }
  return [
    NEEDS_INFO_MARKER,
    'Thanks for the report. Triage needs a little more context:',
    '',
    ...items,
    '',
    'Edit the issue or reply below. `status:needs-info` clears automatically when you respond.',
  ].join('\n');
}

export function buildNeedsInfoResolvedComment() {
  return [
    NEEDS_INFO_MARKER,
    'Thanks, the missing details were added. This issue is back in the triage queue (`status:needs-triage`).',
  ].join('\n');
}

/**
 * Parses a slash command from the first line of a comment.
 * @param {string} body
 * @returns {{ command: string, args: string } | null}
 */
export function parseSlashCommand(body) {
  const firstLine = (body || '').trimStart().split(/\r?\n/, 1)[0].trim();
  const match = /^\/(ready|block|unblock|investigate)(?:\s+(.*))?$/i.exec(firstLine);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: (match[2] || '').trim() };
}

/**
 * Hidden marker tying a blocker notice to the `/block` comment that raised it.
 * @param {number} commentId
 */
export function blockerMarker(commentId) {
  return `<!-- equipqr-issue-blocker:comment-${commentId} -->`;
}

/**
 * @param {string} text
 */
function escapeTableCell(text) {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

/**
 * ITIL-style blocker record posted by `/block <reason>`.
 * @param {{ reason: string, actor: string, timestamp: string, sourceCommentId: number }} details
 */
export function buildBlockerNotice({ reason, actor, timestamp, sourceCommentId }) {
  const safeReason = reason.replace(/\s+/g, ' ').slice(0, 500) || 'No reason given.';
  return [
    blockerMarker(sourceCommentId),
    '### Blocked',
    '',
    '| Field | Value |',
    '| --- | --- |',
    '| Status | `status:blocked` (pending) |',
    `| Blocker | ${escapeTableCell(safeReason)} |`,
    `| Raised by | @${actor} |`,
    `| Raised at | ${timestamp} |`,
    '| Next action | Resolve the dependency, then comment `/unblock` to return this issue to `status:ready-for-dev`. |',
  ].join('\n');
}

/**
 * @param {unknown} error
 * @param {number} status
 */
function hasStatus(error, status) {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === status;
}

/** Repository label names (lowercased), listed once per Octokit client. */
const knownLabelsByClient = new WeakMap();

/**
 * Creates any of the given labels that do not exist in the repository yet.
 * @param {any} github Octokit client from actions/github-script
 * @param {{ owner: string, repo: string }} repo
 * @param {string[]} names
 */
export async function ensureLabels(github, repo, names) {
  if (names.length === 0) return;
  /** @type {Set<string> | undefined} */
  let known = knownLabelsByClient.get(github);
  if (!known) {
    const existing = await github.paginate(github.rest.issues.listLabelsForRepo, { ...repo, per_page: 100 });
    known = new Set(existing.map((/** @type {{ name: string }} */ label) => label.name.toLowerCase()));
    knownLabelsByClient.set(github, known);
  }
  for (const name of names) {
    if (known.has(name.toLowerCase())) continue;
    const definition = LABELS[name] || { name, color: 'ededed', description: '' };
    try {
      await github.rest.issues.createLabel({ ...repo, ...definition });
    } catch (error) {
      // 422: another run created it first.
      if (!hasStatus(error, 422)) throw error;
    }
    known.add(name.toLowerCase());
  }
}

/**
 * @param {any} github
 * @param {{ owner: string, repo: string }} repo
 * @param {number} issueNumber
 * @param {string[]} labels
 */
export async function addLabels(github, repo, issueNumber, labels) {
  if (labels.length === 0) return;
  await ensureLabels(github, repo, labels);
  await github.rest.issues.addLabels({ ...repo, issue_number: issueNumber, labels });
}

/**
 * @param {any} github
 * @param {{ owner: string, repo: string }} repo
 * @param {number} issueNumber
 * @param {string[]} labels
 */
export async function removeLabels(github, repo, issueNumber, labels) {
  for (const name of labels) {
    try {
      await github.rest.issues.removeLabel({ ...repo, issue_number: issueNumber, name });
    } catch (error) {
      // 404: the label was not on the issue.
      if (!hasStatus(error, 404)) throw error;
    }
  }
}

/**
 * Finds a comment the bot posted with the given hidden marker.
 * @param {any} github
 * @param {{ owner: string, repo: string }} repo
 * @param {number} issueNumber
 * @param {string} marker
 * @returns {Promise<{ id: number, body?: string } | undefined>}
 */
async function findBotComment(github, repo, issueNumber, marker) {
  const comments = await github.paginate(github.rest.issues.listComments, { ...repo, issue_number: issueNumber, per_page: 100 });
  return comments.find(
    (/** @type {{ body?: string, user?: { type?: string } }} */ comment) =>
      comment.user?.type === 'Bot' && (comment.body || '').includes(marker),
  );
}

/**
 * Creates the needs-info comment, or updates it in place if the bot already posted one.
 * @param {any} github
 * @param {{ owner: string, repo: string }} repo
 * @param {number} issueNumber
 * @param {string} body
 */
async function upsertNeedsInfoComment(github, repo, issueNumber, body) {
  const existing = await findBotComment(github, repo, issueNumber, NEEDS_INFO_MARKER);
  if (existing) {
    if (existing.body !== body) {
      await github.rest.issues.updateComment({ ...repo, comment_id: existing.id, body });
    }
    return;
  }
  await github.rest.issues.createComment({ ...repo, issue_number: issueNumber, body });
}

/**
 * @param {{ labels?: ({ name?: string } | string)[] }} issue
 * @returns {string[]}
 */
function labelNames(issue) {
  return (issue.labels || []).map((label) => (typeof label === 'string' ? label : label.name || '')).filter(Boolean);
}

/**
 * Entry point for issue-triage.yml (`issues: opened, edited`).
 * @param {{ github: any, context: any, core: any }} args
 */
export async function runTriage({ github, context, core }) {
  const { issue, action } = context.payload;
  const repo = context.repo;
  const title = issue.title || '';
  const body = issue.body || '';
  const current = labelNames(issue);
  const has = (/** @type {string} */ name) => current.includes(name);

  if (issue.state !== 'open') {
    core.info(`Issue #${issue.number} is ${issue.state}; skipping triage.`);
    return;
  }

  // Area labels are additive so maintainer corrections are never undone.
  const areas = classifyAreas(title, body).filter((label) => !has(label));
  await addLabels(github, repo, issue.number, areas);
  core.info(`Area labels added: ${areas.join(', ') || 'none'}`);

  if (action === 'opened') {
    await removeLabels(github, repo, issue.number, FORBIDDEN_ON_OPEN.filter(has));
  }

  if (!isBugReport({ title, body, labels: current })) {
    core.info('Not a bug report; no status change.');
    return;
  }

  const missing = findMissingBugInfo(body);

  if (action === 'opened') {
    if (missing.length > 0) {
      await addLabels(github, repo, issue.number, ['status:needs-info']);
      await upsertNeedsInfoComment(github, repo, issue.number, buildNeedsInfoComment(missing));
      core.info(`Bug report is missing: ${missing.join(', ')}`);
    } else {
      await addLabels(github, repo, issue.number, ['status:needs-triage']);
      core.info('Bug report is complete; queued for triage.');
    }
    return;
  }

  // Edits only move issues that are still waiting on the reporter.
  if (!has('status:needs-info')) {
    core.info('Edited issue is not in status:needs-info; no status change.');
    return;
  }
  if (missing.length > 0) {
    await upsertNeedsInfoComment(github, repo, issue.number, buildNeedsInfoComment(missing));
    core.info(`Bug report is still missing: ${missing.join(', ')}`);
    return;
  }
  await removeLabels(github, repo, issue.number, ['status:needs-info']);
  await addLabels(github, repo, issue.number, ['status:needs-triage']);
  await upsertNeedsInfoComment(github, repo, issue.number, buildNeedsInfoResolvedComment());
  core.info('Missing details were added; moved to status:needs-triage.');
}

/**
 * @param {{ type?: string, login?: string } | undefined} user
 */
function isBot(user) {
  return user?.type === 'Bot' || /\[bot\]$/i.test(user?.login || '');
}

/**
 * @param {any} github
 * @param {{ owner: string, repo: string }} repo
 * @param {string} username
 */
async function isMaintainer(github, repo, username) {
  try {
    const { data } = await github.rest.repos.getCollaboratorPermissionLevel({ ...repo, username });
    return MAINTAINER_PERMISSIONS.has(data.permission);
  } catch (error) {
    // 404: not a collaborator.
    if (hasStatus(error, 404)) return false;
    throw error;
  }
}

/**
 * @param {any} github
 * @param {{ owner: string, repo: string }} repo
 * @param {number} commentId
 * @param {string} content
 */
async function react(github, repo, commentId, content) {
  await github.rest.reactions.createForIssueComment({ ...repo, comment_id: commentId, content });
}

/**
 * Entry point for issue-comment-handler.yml (`issue_comment: created`).
 * @param {{ github: any, context: any, core: any }} args
 */
export async function runCommentHandler({ github, context, core }) {
  const { issue, comment } = context.payload;
  const repo = context.repo;

  if (issue.pull_request) {
    core.info('Comment is on a pull request; skipping.');
    return;
  }
  if (isBot(comment.user)) {
    core.info(`Ignoring bot comment from ${comment.user.login}.`);
    return;
  }

  const current = labelNames(issue);
  const has = (/** @type {string} */ name) => current.includes(name);
  const slash = parseSlashCommand(comment.body || '');

  if (slash) {
    if (!(await isMaintainer(github, repo, comment.user.login))) {
      core.info(`${comment.user.login} is not a maintainer; ignoring /${slash.command}.`);
      await react(github, repo, comment.id, 'confused');
      return;
    }

    switch (slash.command) {
      case 'ready':
        await removeLabels(github, repo, issue.number, ['status:needs-triage', 'status:needs-info', 'status:needs-investigation'].filter(has));
        await addLabels(github, repo, issue.number, ['status:ready-for-dev']);
        break;
      case 'block':
        await removeLabels(github, repo, issue.number, ['status:ready-for-dev'].filter(has));
        await addLabels(github, repo, issue.number, ['status:blocked']);
        // A rerun of the same /block event reuses its notice instead of posting another.
        if (!(await findBotComment(github, repo, issue.number, blockerMarker(comment.id)))) {
          await github.rest.issues.createComment({
            ...repo,
            issue_number: issue.number,
            body: buildBlockerNotice({
              reason: slash.args,
              actor: comment.user.login,
              timestamp: new Date().toISOString(),
              sourceCommentId: comment.id,
            }),
          });
        }
        break;
      case 'unblock':
        await removeLabels(github, repo, issue.number, ['status:blocked'].filter(has));
        await addLabels(github, repo, issue.number, ['status:ready-for-dev']);
        break;
      case 'investigate':
        await addLabels(github, repo, issue.number, ['status:needs-investigation']);
        break;
    }
    await react(github, repo, comment.id, '+1');
    core.info(`Applied /${slash.command} for ${comment.user.login}.`);
    return;
  }

  if (has('status:needs-info') && comment.user.login === issue.user?.login) {
    await removeLabels(github, repo, issue.number, ['status:needs-info']);
    await addLabels(github, repo, issue.number, ['status:needs-triage']);
    core.info('Reporter responded; moved to status:needs-triage.');
    return;
  }

  core.info('No automation applies to this comment.');
}
