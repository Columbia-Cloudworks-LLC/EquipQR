// Tests for issue-automation.js using Node.js built-in test runner (Node 18+).
// Run with: node --test .github/scripts/issue-automation.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  NEEDS_INFO_MARKER,
  blockerMarker,
  buildBlockerNotice,
  classifyAreas,
  findMissingBugInfo,
  isBugReport,
  parseFormSections,
  parseSlashCommand,
  runCommentHandler,
  runTriage,
} from './issue-automation.js';

const BUG_FORM_COMPLETE = `### Describe the bug

The work order list is blank.

### Steps to reproduce

1. Open Work Orders
2. Filter by team

### Logs

\`\`\`
TypeError: Cannot read properties of undefined
\`\`\``;

const BUG_FORM_EMPTY = `### Describe the bug

Something broke.

### Steps to reproduce

_No response_

### Logs

_No response_`;

/**
 * Minimal Octokit stand-in that records every write.
 * @param {{ labels?: string[], comments?: object[], permission?: string }} [options]
 */
function fakeGithub({ labels = [], comments = [], permission = 'read' } = {}) {
  const calls = [];
  const record = (name) => async (params) => {
    calls.push({ name, params });
    return { data: {} };
  };
  const github = {
    calls,
    paginate: async (method) => {
      if (method === github.rest.issues.listLabelsForRepo) return labels.map((name) => ({ name }));
      if (method === github.rest.issues.listComments) return comments;
      return [];
    },
    rest: {
      issues: {
        listLabelsForRepo: () => {},
        listComments: () => {},
        createLabel: record('createLabel'),
        addLabels: record('addLabels'),
        removeLabel: async (params) => {
          calls.push({ name: 'removeLabel', params });
          throw Object.assign(new Error('Not Found'), { status: 404 });
        },
        createComment: record('createComment'),
        updateComment: record('updateComment'),
      },
      repos: {
        getCollaboratorPermissionLevel: async () => ({ data: { permission } }),
      },
      reactions: {
        createForIssueComment: record('reaction'),
      },
    },
  };
  return github;
}

const core = { info: () => {} };
const repo = { owner: 'acme', repo: 'equipqr' };

function names(github, callName) {
  return github.calls.filter((call) => call.name === callName);
}

function addedLabels(github) {
  return names(github, 'addLabels').flatMap((call) => call.params.labels);
}

describe('classifyAreas', () => {
  test('labels database issues from keywords and paths', () => {
    assert.deepEqual(classifyAreas('RLS blocks inserts', ''), ['area:database']);
    assert.deepEqual(classifyAreas('Broken', 'See supabase/migrations/2026_add.sql'), ['area:database']);
  });

  test('labels multiple areas', () => {
    const areas = classifyAreas('Stripe invoice missing for work order', 'Playwright test is flaky');
    assert.deepEqual(areas, ['area:work-orders', 'area:billing', 'area:ci']);
  });

  test('labels fleet map and equipment', () => {
    assert.deepEqual(classifyAreas('Fleet map pins are wrong', 'GPS for my forklift'), ['area:fleet-map', 'area:equipment']);
  });

  test('ignores empty form responses and unrelated text', () => {
    assert.deepEqual(classifyAreas('Login button is misaligned', '### Area\n\n_No response_'), []);
  });

  test('does not match words that only contain a keyword', () => {
    assert.deepEqual(classifyAreas('Circle icon is off-center', 'The decision banner is too wide'), []);
  });
});

describe('isBugReport', () => {
  test('detects the bug label, title prefix, and bug form', () => {
    assert.equal(isBugReport({ title: 'x', body: '', labels: ['bug'] }), true);
    assert.equal(isBugReport({ title: '[Bug] crash', body: '', labels: [] }), true);
    assert.equal(isBugReport({ title: 'x', body: BUG_FORM_EMPTY, labels: [] }), true);
    assert.equal(isBugReport({ title: 'Add CSV export', body: 'Please add it', labels: ['enhancement'] }), false);
  });
});

describe('findMissingBugInfo', () => {
  test('complete bug form is not missing anything', () => {
    assert.deepEqual(findMissingBugInfo(BUG_FORM_COMPLETE), []);
  });

  test('empty form fields count as missing', () => {
    assert.deepEqual(findMissingBugInfo(BUG_FORM_EMPTY), ['reproduction steps', 'logs']);
  });

  test('free-form body with numbered steps and a screenshot', () => {
    const body = '1. Open equipment\n2. Scan QR\n\n![screenshot](https://github.com/user-attachments/assets/abc)';
    assert.deepEqual(findMissingBugInfo(body), []);
  });

  test('a GitHub attachment link counts as evidence, a lookalike host does not', () => {
    const steps = '1. Open equipment\n2. Scan QR\n\n';
    assert.deepEqual(findMissingBugInfo(`${steps}Recording: https://github.com/user-attachments/assets/abc123`), []);
    assert.deepEqual(findMissingBugInfo(`${steps}See https://github.com.evil.example/user-attachments/x`), ['logs']);
  });

  test('free-form body without detail is missing both', () => {
    assert.deepEqual(findMissingBugInfo('It does not work.'), ['reproduction steps', 'logs']);
  });
});

describe('parseFormSections', () => {
  test('normalizes _No response_ to empty content', () => {
    const sections = parseFormSections(BUG_FORM_EMPTY);
    assert.equal(sections.length, 3);
    assert.equal(sections[1].heading, 'Steps to reproduce');
    assert.equal(sections[1].content, '');
  });
});

describe('parseSlashCommand', () => {
  test('parses supported commands on the first line', () => {
    assert.deepEqual(parseSlashCommand('/ready'), { command: 'ready', args: '' });
    assert.deepEqual(parseSlashCommand('  /BLOCK waiting on Intuit sandbox\nmore text'), {
      command: 'block',
      args: 'waiting on Intuit sandbox',
    });
    assert.deepEqual(parseSlashCommand('/unblock'), { command: 'unblock', args: '' });
    assert.deepEqual(parseSlashCommand('/investigate'), { command: 'investigate', args: '' });
  });

  test('ignores unknown commands and commands not on the first line', () => {
    assert.equal(parseSlashCommand('/deploy now'), null);
    assert.equal(parseSlashCommand('/readyish'), null);
    assert.equal(parseSlashCommand('thanks!\n/ready'), null);
  });
});

describe('buildBlockerNotice', () => {
  test('escapes table pipes and backslashes and records the actor', () => {
    const notice = buildBlockerNotice({
      reason: 'needs A | B \\ C',
      actor: 'octo',
      timestamp: '2026-10-11T00:00:00.000Z',
      sourceCommentId: 5,
    });
    assert.ok(notice.includes('needs A \\| B \\\\ C'));
    assert.match(notice, /@octo/);
    assert.match(notice, /`\/unblock`/);
    assert.ok(notice.startsWith(blockerMarker(5)));
  });
});

describe('runTriage', () => {
  const baseIssue = { number: 7, state: 'open', title: '[Bug] Work order list blank', user: { login: 'reporter' } };

  test('incomplete bug report gets needs-info and one checklist comment', async () => {
    const github = fakeGithub();
    await runTriage({
      github,
      core,
      context: { repo, payload: { action: 'opened', issue: { ...baseIssue, body: BUG_FORM_EMPTY, labels: [] } } },
    });
    assert.deepEqual(addedLabels(github), ['area:work-orders', 'status:needs-info']);
    const comments = names(github, 'createComment');
    assert.equal(comments.length, 1);
    assert.match(comments[0].params.body, /Steps to reproduce/);
    assert.ok(comments[0].params.body.startsWith(NEEDS_INFO_MARKER));
    // Missing labels are created before use.
    assert.ok(names(github, 'createLabel').some((call) => call.params.name === 'status:needs-info'));
  });

  test('complete bug report goes to needs-triage and strips in-progress/blocked', async () => {
    const github = fakeGithub({ labels: ['area:work-orders', 'status:needs-triage'] });
    await runTriage({
      github,
      core,
      context: {
        repo,
        payload: {
          action: 'opened',
          issue: { ...baseIssue, body: BUG_FORM_COMPLETE, labels: [{ name: 'status:in-progress' }, { name: 'status:blocked' }] },
        },
      },
    });
    assert.deepEqual(addedLabels(github), ['area:work-orders', 'status:needs-triage']);
    assert.deepEqual(
      names(github, 'removeLabel').map((call) => call.params.name),
      ['status:in-progress', 'status:blocked'],
    );
    assert.equal(names(github, 'createComment').length, 0);
    assert.equal(names(github, 'createLabel').length, 0);
  });

  test('editing in the missing details swaps needs-info for needs-triage and updates the comment', async () => {
    const github = fakeGithub({
      comments: [{ id: 99, user: { type: 'Bot' }, body: `${NEEDS_INFO_MARKER}\nold checklist` }],
    });
    await runTriage({
      github,
      core,
      context: {
        repo,
        payload: {
          action: 'edited',
          issue: { ...baseIssue, body: BUG_FORM_COMPLETE, labels: [{ name: 'bug' }, { name: 'status:needs-info' }] },
        },
      },
    });
    assert.deepEqual(names(github, 'removeLabel').map((call) => call.params.name), ['status:needs-info']);
    assert.ok(addedLabels(github).includes('status:needs-triage'));
    assert.equal(names(github, 'createComment').length, 0);
    assert.equal(names(github, 'updateComment')[0].params.comment_id, 99);
  });

  test('edits do not change the status of already-triaged issues', async () => {
    const github = fakeGithub();
    await runTriage({
      github,
      core,
      context: {
        repo,
        payload: {
          action: 'edited',
          issue: { ...baseIssue, body: BUG_FORM_EMPTY, labels: [{ name: 'bug' }, { name: 'status:in-progress' }] },
        },
      },
    });
    assert.ok(!addedLabels(github).some((label) => label.startsWith('status:')));
    assert.equal(names(github, 'removeLabel').length, 0);
  });

  test('feature requests get area labels only', async () => {
    const github = fakeGithub();
    await runTriage({
      github,
      core,
      context: {
        repo,
        payload: { action: 'opened', issue: { ...baseIssue, title: 'Add subscription seats', body: 'Please', labels: [] } },
      },
    });
    assert.deepEqual(addedLabels(github), ['area:billing']);
  });
});

describe('runCommentHandler', () => {
  const issue = { number: 7, user: { login: 'reporter' }, labels: [{ name: 'status:needs-info' }] };

  test('ignores bot comments', async () => {
    const github = fakeGithub();
    await runCommentHandler({
      github,
      core,
      context: { repo, payload: { issue, comment: { id: 1, body: '/ready', user: { login: 'github-actions[bot]', type: 'Bot' } } } },
    });
    assert.equal(github.calls.length, 0);
  });

  test('ignores pull request comments', async () => {
    const github = fakeGithub({ permission: 'admin' });
    await runCommentHandler({
      github,
      core,
      context: { repo, payload: { issue: { ...issue, pull_request: {} }, comment: { id: 1, body: '/ready', user: { login: 'maint', type: 'User' } } } },
    });
    assert.equal(github.calls.length, 0);
  });

  test('reporter reply moves needs-info to needs-triage', async () => {
    const github = fakeGithub();
    await runCommentHandler({
      github,
      core,
      context: { repo, payload: { issue, comment: { id: 1, body: 'Here are the logs', user: { login: 'reporter', type: 'User' } } } },
    });
    assert.deepEqual(names(github, 'removeLabel').map((call) => call.params.name), ['status:needs-info']);
    assert.deepEqual(addedLabels(github), ['status:needs-triage']);
  });

  test('replies from other users leave needs-info alone', async () => {
    const github = fakeGithub();
    await runCommentHandler({
      github,
      core,
      context: { repo, payload: { issue, comment: { id: 1, body: '+1 same here', user: { login: 'someone', type: 'User' } } } },
    });
    assert.equal(github.calls.length, 0);
  });

  test('non-maintainers cannot run slash commands', async () => {
    const github = fakeGithub({ permission: 'read' });
    await runCommentHandler({
      github,
      core,
      context: { repo, payload: { issue, comment: { id: 5, body: '/ready', user: { login: 'reporter', type: 'User' } } } },
    });
    assert.deepEqual(github.calls.map((call) => call.name), ['reaction']);
    assert.equal(github.calls[0].params.content, 'confused');
  });

  test('/ready clears triage labels and marks ready-for-dev', async () => {
    const github = fakeGithub({ permission: 'admin' });
    await runCommentHandler({
      github,
      core,
      context: {
        repo,
        payload: {
          issue: { ...issue, labels: [{ name: 'status:needs-info' }, { name: 'status:needs-triage' }] },
          comment: { id: 5, body: '/ready', user: { login: 'maint', type: 'User' } },
        },
      },
    });
    assert.deepEqual(names(github, 'removeLabel').map((call) => call.params.name), ['status:needs-triage', 'status:needs-info']);
    assert.deepEqual(addedLabels(github), ['status:ready-for-dev']);
    assert.equal(names(github, 'reaction')[0].params.content, '+1');
  });

  test('/block adds the label and posts a blocker notice', async () => {
    const github = fakeGithub({ permission: 'write' });
    await runCommentHandler({
      github,
      core,
      context: {
        repo,
        payload: { issue: { ...issue, labels: [] }, comment: { id: 5, body: '/block waiting on Intuit', user: { login: 'maint', type: 'User' } } },
      },
    });
    assert.deepEqual(addedLabels(github), ['status:blocked']);
    assert.match(names(github, 'createComment')[0].params.body, /waiting on Intuit/);
  });

  test('a rerun of the same /block event does not post a second notice', async () => {
    const github = fakeGithub({
      permission: 'write',
      comments: [{ id: 77, user: { type: 'Bot' }, body: `${blockerMarker(5)}\n### Blocked` }],
    });
    await runCommentHandler({
      github,
      core,
      context: {
        repo,
        payload: { issue: { ...issue, labels: [] }, comment: { id: 5, body: '/block waiting on Intuit', user: { login: 'maint', type: 'User' } } },
      },
    });
    assert.deepEqual(addedLabels(github), ['status:blocked']);
    assert.equal(names(github, 'createComment').length, 0);
  });

  test('/unblock and /investigate', async () => {
    const unblock = fakeGithub({ permission: 'maintain' });
    await runCommentHandler({
      github: unblock,
      core,
      context: {
        repo,
        payload: { issue: { ...issue, labels: [{ name: 'status:blocked' }] }, comment: { id: 5, body: '/unblock', user: { login: 'maint', type: 'User' } } },
      },
    });
    assert.deepEqual(names(unblock, 'removeLabel').map((call) => call.params.name), ['status:blocked']);
    assert.deepEqual(addedLabels(unblock), ['status:ready-for-dev']);

    const investigate = fakeGithub({ permission: 'admin' });
    await runCommentHandler({
      github: investigate,
      core,
      context: { repo, payload: { issue: { ...issue, labels: [] }, comment: { id: 5, body: '/investigate', user: { login: 'maint', type: 'User' } } } },
    });
    assert.deepEqual(addedLabels(investigate), ['status:needs-investigation']);
  });

  test('a maintainer who is also the reporter runs the command, not the reply rule', async () => {
    const github = fakeGithub({ permission: 'admin' });
    await runCommentHandler({
      github,
      core,
      context: { repo, payload: { issue, comment: { id: 5, body: '/investigate', user: { login: 'reporter', type: 'User' } } } },
    });
    assert.deepEqual(addedLabels(github), ['status:needs-investigation']);
    assert.equal(names(github, 'removeLabel').length, 0);
  });
});
