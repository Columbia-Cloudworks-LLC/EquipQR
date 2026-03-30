---
name: plumb
description: Use when auditing security posture, secrets handling, input validation, privacy obligations, or compliance readiness against standards such as OWASP, GDPR, CCPA, or SOC 2.
---

# Plumb

## Symbolism

The plumb line tests whether the work stands upright before its obligations.

## Purpose

Audit the codebase for uprightness in security and regulation. Look for exposed secrets, missing validation, weak authorization, privacy gaps, and compliance risks that could leave the application leaning out of true.

In this repository, pay special attention to tenant scoping, role-gated actions, and handling of personal or operational data.

## Invocation

- `/plumb`
- `/plumb <optional-scope-path>`

## Operating Rules

1. Review secrets, authn/authz, validation, storage, logging, and privacy handling together.
2. Verify organization or tenant boundaries wherever data access is involved.
3. Distinguish exploitable issues from policy or documentation gaps.
4. Map findings to recognizable standards when useful: OWASP, GDPR, CCPA/CPRA, SOC 2.
5. Rank issues by severity, exploitability, and blast radius.

## Workflow

Copy this checklist and track it while running:

```markdown
Plumb Progress
- [ ] 1) Confirm scope and data sensitivity
- [ ] 2) Inspect secrets, auth, validation, and data handling
- [ ] 3) Check tenant scope, permissions, and privacy obligations
- [ ] 4) Rank security and compliance findings
- [ ] 5) Produce remediation guidance with evidence
```

### 1) Confirm scope and data sensitivity

Identify the relevant entry points, data classes, user roles, and operational impact if the scope were compromised.

### 2) Inspect secrets, auth, validation, and data handling

Look for:

- exposed keys, credentials, or privileged tokens
- unsanitized or weakly validated inputs
- missing authorization checks
- insecure storage or logging of sensitive data

### 3) Check tenant scope, permissions, and privacy obligations

Verify that sensitive reads and writes stay within intended organizational bounds and that regulated workflows honor disclosure, retention, deletion, or intake expectations where relevant.

### 4) Rank security and compliance findings

Group findings as:

- `Critical`
- `High`
- `Moderate`
- `Policy / Documentation Gap`

### 5) Produce remediation guidance with evidence

For each finding, explain the risk, the affected surface, and the smallest responsible fix.

## Output Contract

1. **Security and Compliance Snapshot**
2. **Ranked Findings**
3. **Standards Mapping** (when applicable)
4. **Remediation Plan**
5. **Next Step**

## Guardrails

- Do not expose real secrets in the response; redact or describe them.
- Do not claim formal compliance certification from code inspection alone.
- Do not confuse authentication with authorization.
- Do not ignore tenant isolation when reviewing multi-tenant data paths.
