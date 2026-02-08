#!/usr/bin/env python3
"""
Secret Guardian — Cursor Hook
Scans agent prompts and shell commands for hardcoded secrets
(Stripe keys, Supabase service-role JWTs, QBO refresh tokens)
and blocks the action when a match is found.

Registered under: beforeSubmitPrompt, beforeShellExecution
"""

import json
import re
import sys

# ---------------------------------------------------------------------------
# Regex patterns for secrets we want to catch
# ---------------------------------------------------------------------------
SECRET_PATTERNS: dict[str, re.Pattern] = {
    "Stripe Secret Key": re.compile(
        r"sk_(live|test)_[0-9a-zA-Z]{10,}"
    ),
    "Supabase Service Role Key": re.compile(
        # Supabase service-role keys are HS256 JWTs whose header is always
        # eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9  (base-64 of
        # {"alg":"HS256","typ":"JWT"}).  We require a long payload to
        # distinguish real keys from short test stubs.
        r"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        r"\.[A-Za-z0-9_\-]{100,}"
        r"\.[A-Za-z0-9_\-]{20,}"
    ),
    "QBO Refresh Token": re.compile(
        # Intuit / QuickBooks Online OAuth 2 refresh tokens — typically
        # prefixed with AB11 and followed by a long alphanumeric string.
        # Also catch generic "refresh_token" assignments with long values.
        r"(?:"
        r"AB11[A-Za-z0-9]{20,}"            # Intuit-specific prefix
        r"|"
        r"refresh_token\s*[=:]\s*[\"']?"    # key = "value" style
        r"[A-Za-z0-9_\-]{30,}"
        r")"
    ),
}


def scan_for_secrets(text: str) -> list[str]:
    """Return names of every secret pattern that matches *text*."""
    return [
        name
        for name, pattern in SECRET_PATTERNS.items()
        if pattern.search(text)
    ]


def main() -> None:
    raw_input = sys.stdin.read()

    try:
        data: dict = json.loads(raw_input)
    except (json.JSONDecodeError, TypeError):
        # Unparseable input — allow through so we don't break the IDE
        print(json.dumps({"continue": True}))
        sys.exit(0)

    # Collect every string field the hook might receive depending on
    # whether this is a beforeSubmitPrompt or beforeShellExecution call.
    text_parts: list[str] = []
    for key in ("prompt", "command", "input", "message"):
        value = data.get(key)
        if isinstance(value, str):
            text_parts.append(value)

    text_to_scan = " ".join(text_parts) if text_parts else raw_input

    detected = scan_for_secrets(text_to_scan)

    if detected:
        secret_types = ", ".join(detected)
        response = {
            "continue": False,
            "user_message": (
                f"Action blocked: potential secret detected ({secret_types}). "
                "Use environment variables instead."
            ),
            "agent_message": json.dumps({
                "status": "blocked",
                "reason": (
                    "Action blocked: Potential secret detected. "
                    "Use environment variables instead."
                ),
                "detected_types": detected,
                "recommendation": (
                    "Reference secrets via environment variables "
                    "(e.g. process.env.STRIPE_SECRET_KEY, "
                    "import.meta.env.VITE_SUPABASE_ANON_KEY) "
                    "rather than hardcoding values."
                ),
            }),
        }
    else:
        response = {"continue": True}

    print(json.dumps(response))
    sys.exit(0)


if __name__ == "__main__":
    main()
