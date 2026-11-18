# Changelog

## 0.1.0

Initial release.

- 80 MCP tools covering account, servers, channels, messages, members, roles, invites, threads, emoji, DMs and user lookup.
- Lazy login with a clear error when `DISCORD_TOKEN` is missing or invalid.
- Write and admin switches (`DISCORD_MCP_ALLOW_WRITE`, `DISCORD_MCP_ALLOW_ADMIN`) and a guild allowlist (`DISCORD_MCP_GUILDS`).
- DM sending restricted to existing DM channels; captcha-gated actions excluded by design.
- Permission names accepted as `SendMessages` or `SEND_MESSAGES` and validated before requests.
- Unit tests for validation and permission parsing, plus an offline stdio smoke test.
