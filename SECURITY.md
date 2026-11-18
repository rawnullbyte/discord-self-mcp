# Security policy

This project automates a Discord user account, which is already against Discord's Terms of Service. "Security" here means protecting your token and your account, not defending Discord.

## Reporting

Open a private security advisory on GitHub (`Security` tab, `Report a vulnerability`) for:

- a path that leaks the token in logs, errors or tool output
- a tool that bypasses the write/admin guards
- a way to trigger actions outside the documented surface

Do not include real tokens, session cookies or personal data in a report. Rotate any token you believe leaked before reporting.

## Out of scope

- Discord banning the account (expected risk, documented in `docs/security.md`)
- Captcha-gated actions failing (intentional, see `docs/capabilities.md`)
- Rate limits
- Vulnerabilities in `@discord-selfbot/core` itself; report those to the upstream project

## Supported versions

Only the latest release is supported.
