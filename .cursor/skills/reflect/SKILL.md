---
name: reflect
description: Reflect
disable-model-invocation: true
---

# Reflect

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

Reflect on this conversation.
Identify what worked and what didn't.
Identify potential improvements in your tools and rules, or my work style, that would have made the process more efficient.
Identify important questions that were not asked.
Identify important questions that I didn't answer.
Be prepared to update every relevant file with my approval.
