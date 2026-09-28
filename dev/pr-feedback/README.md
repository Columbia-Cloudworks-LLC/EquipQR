# PR feedback workflows

Run `bash dev/pr-feedback/workflow.sh help` in Linux.
Read-only actions are `context`, `checks`, `reviews`, and `threads`, with `--pr NUMBER`.
`verify` runs the shared verification script. The thread collector paginates both
review threads and each thread's comments, retaining unresolved current and outdated sets.

`publish` accepts `--replies-file`, `--issues-file`, and `--summary-file`.
Use `--dry-run` to validate before authorized publication. Reply entries require
`inReplyTo` (the parent numeric comment ID) and `body`. Issue entries require
`title` and either `body` or `bodyFile`. No comments are posted by inspection actions.

Qodo-specific collectors are retired with Qodo. Existing comments remain available
through the generic GitHub review and thread collectors.
See [Bash workflows](../../docs/ops/linux-workflows.md).
