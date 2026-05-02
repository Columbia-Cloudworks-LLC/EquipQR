---
name: reflect
description: Use after a Cursor session that felt inefficient, wrong, or confusing when you want a structured retrospective and optional updates to AGENTS.md, `.cursor/rules/`, or `.cursor/skills/`—apply edits only with your explicit approval on each file.
disable-model-invocation: true
---

# Reflect

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Output

Cover each item below in order:

1. **What worked** — approaches, tools, or decisions that helped.
2. **What did not** — friction, errors, retries, or misunderstandings.
3. **Improvements** — concrete changes to tools, rules, skills, or collaboration habits that would have helped (tie each to a file or practice when possible).
4. **Unasked questions** — gaps the agent should have surfaced earlier.
5. **Unanswered questions** — things you left open that still block clarity.

End by listing any workflow files worth updating; **do not edit files** until you approve each change.

## Invocation

- `/reflect` — run against the current conversation.
- User phrases such as “retro this chat”, “what should we fix in our agent setup”, or “capture lessons from this session” map here.
