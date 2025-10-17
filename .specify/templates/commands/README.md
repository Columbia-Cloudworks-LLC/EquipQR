# SpecKit Commands Directory

This directory contains command execution templates for SpecKit workflows.

## Purpose

Command templates define the execution flow for SpecKit commands (e.g., `/speckit.plan`, `/speckit.tasks`, `/speckit.constitution`). Each command file documents:

- Input parameters and requirements
- Execution workflow steps
- Output artifacts and locations
- Validation rules and gates
- Constitution compliance checks

## Constitution Alignment

All command templates MUST reference and enforce compliance with `.specify/memory/constitution.md`:

- **Multi-tenancy**: Ensure all commands validate `organization_id` filtering
- **Type Safety**: Require TypeScript interfaces for generated code
- **Architecture**: Enforce correct component placement (pages/features/ui)
- **Security**: Include RBAC and input validation requirements
- **Testing**: Mandate test coverage and quality gates
- **Performance**: Check bundle size and optimization requirements

## Creating New Commands

When creating a new command template:

1. **File naming**: Use kebab-case (e.g., `plan.md`, `tasks.md`, `constitution.md`)
2. **Structure**: Include clear sections for inputs, workflow, outputs, and validation
3. **Constitution check**: Reference specific principles from the constitution
4. **Generic guidance**: Avoid hardcoded agent names; use generic workflow instructions
5. **Version tracking**: Document when the command template was last updated

## Existing Commands

Commands referenced in the SpecKit system:

- **speckit.constitution**: Create/update project constitution (defined in original command file)
- **speckit.plan**: Generate implementation plan from feature spec
- **speckit.tasks**: Generate task list from design documents
- **speckit.spec**: Create feature specification from user requirements

## Template Synchronization

When the constitution is updated:

1. Review all command templates for alignment
2. Update constitution check sections
3. Add new principle validations if applicable
4. Remove references to deprecated principles
5. Document changes in the constitution's sync impact report

## References

- Constitution: `.specify/memory/constitution.md`
- Plan Template: `.specify/templates/plan-template.md`
- Spec Template: `.specify/templates/spec-template.md`
- Tasks Template: `.specify/templates/tasks-template.md`

