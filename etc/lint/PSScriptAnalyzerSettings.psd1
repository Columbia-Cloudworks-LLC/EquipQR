# Style-only noise we keep off the gate:
# - PSAvoidUsingWriteHost: hooks and stack scripts talk to a human console.
# - PSAvoidUsingCmdletAliases: existing scripts use %, ?, select as idiomatic PS.
# Everything else stays on so real bugs still fail lint:all.
@{
    Severity     = @('Error', 'Warning')
    ExcludeRules = @(
        'PSAvoidUsingWriteHost'
        'PSAvoidUsingCmdletAliases'
    )
}
