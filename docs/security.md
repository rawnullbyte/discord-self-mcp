# Security

## The token is the account

A Discord user token authenticates the whole account: every server, every DM, billing settings, the lot. It is not a scoped API key and it cannot be limited to one server by Discord. Anyone who reads it can take over the account until the password is changed.

- Never paste a token into a chat, issue, commit or screenshot.
- Keep the MCP config out of version control. `chmod 600 ~/.config/opencode/opencode.json`.
- Prefer a client feature that expands the token from an environment variable over writing it to disk.
- If a token leaks, change the account password immediately, which invalidates all sessions, then re-login.

## Terms of Service

Using a user account with Discord's API, including this server, violates Discord's Terms of Service. Consequences range from a captcha challenge to a permanent ban. Run this on an account you are willing to lose. Nothing in this repository makes the risk go away.

## Least privilege

- Set `DISCORD_MCP_ALLOW_ADMIN=0` when the agent only needs to read and write messages.
- Set `DISCORD_MCP_ALLOW_WRITE=0` for pure analysis.
- Set `DISCORD_MCP_GUILDS` to the servers the agent should touch. Other guilds fail before any request.
- Give the account only the Discord permissions it needs. A selfbot account with Administrator can delete a whole server through one bad tool call.

## Destructive tools

These require the `ALLOW_ADMIN` switch and an explicit `confirm: true` where marked:

- `discord_delete_message`, `discord_delete_channel`, `discord_delete_role`, `discord_delete_invite`
- `discord_kick_member`, `discord_ban_member`, `discord_prune_members`, `discord_leave_guild`
- `discord_edit_permission_overwrite`, `discord_delete_permission_overwrite`
- `discord_join_guild` (joins the account to a new server)

`discord_prune_members` defaults to `dryRun: true`. Run it once without changing that to see the count.

## Auditability

Every action appears in Discord's audit log where Discord records that action type, attributed to your account. There is no separate MCP audit trail; enable client-side logging if you need to correlate agent calls:

```sh
DISCORD_TOKEN=... node dist/index.js 2>> mcp.log
```

Tool arguments are sent by the client and not logged by the server.

## Sandboxing

For anything beyond a personal setup, run the MCP server on a dedicated machine or container with a dedicated account, network egress limited to Discord, and no access to other credentials. The server itself has no shell, file or network tools beyond the Discord client.

## Reporting

See [SECURITY.md](../SECURITY.md). Do not open a public issue containing a token or a working exploit against someone else's account.
