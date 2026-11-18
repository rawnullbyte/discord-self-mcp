# discord-self-mcp

MCP server that exposes a Discord **user account** to coding agents: read and send messages, manage channels, roles and members, handle invites, threads and emoji, and moderate a server.

Built on [`@discord-selfbot/core`](https://github.com/xirothedev/discord.js-selfbot), the TypeScript fork of discord.js-selfbot.

Works with OpenCode, Claude Code, Cursor, Zed, or any MCP client that speaks stdio.

> **Warning:** automating a user account through the Discord API breaks Discord's Terms of Service and can get the account banned. Use an account you can afford to lose. The token is a full account credential: anyone with it owns the account.

## Features

- 80 tools across account, servers, channels, messages, members, roles, invites, threads, emoji and DMs.
- Read and write modes, plus a separate switch for destructive/admin actions.
- Optional guild allowlist so an agent cannot touch servers you did not name.
- DM sending limited to conversations that already exist, because opening new DMs needs a captcha.
- Snowflake ids validated before any request; permission names validated against the library flag table.
- Login is lazy, so the MCP server starts immediately and reports a clear error if the token is wrong.

## Install

```sh
git clone https://github.com/rawnullbyte/discord-self-mcp.git
cd discord-self-mcp
npm install
npm run build
```

## OpenCode

```json
{
  "mcp": {
    "discord": {
      "type": "local",
      "command": ["node", "/home/you/Projects/discord-self-mcp/dist/index.js"],
      "enabled": true,
      "environment": {
        "DISCORD_TOKEN": "your-user-token"
      }
    }
  }
}
```

`npx -y /home/you/Projects/discord-self-mcp` works too if you prefer npx over an explicit path. See [docs/setup.md](docs/setup.md) for Claude Desktop and other clients.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `DISCORD_TOKEN` | required | User account token. |
| `DISCORD_MCP_ALLOW_WRITE` | `1` | `0` exposes read-only tools. |
| `DISCORD_MCP_ALLOW_ADMIN` | `1` | `0` blocks moderation, role, channel and server changes. |
| `DISCORD_MCP_GUILDS` | all | Comma-separated guild ids the server may touch. |
| `DISCORD_MCP_LOGIN_TIMEOUT_MS` | `60000` | Login wait before tools report a timeout. |

Full details in [docs/configuration.md](docs/configuration.md).

## Tools

| Group | Examples |
| --- | --- |
| Account | `discord_whoami`, `discord_set_status`, `discord_set_avatar`, `discord_list_friends` |
| Servers | `discord_list_guilds`, `discord_guild_info`, `discord_edit_guild`, `discord_list_audit_logs` |
| Channels | `discord_list_channels`, `discord_create_channel`, `discord_edit_permission_overwrite` |
| Messages | `discord_read_messages`, `discord_send_message`, `discord_search_messages`, `discord_react` |
| Members | `discord_list_members`, `discord_add_role`, `discord_timeout_member`, `discord_kick_member` |
| Roles | `discord_list_roles`, `discord_create_role`, `discord_edit_role`, `discord_set_role_position` |
| Invites | `discord_create_invite`, `discord_list_guild_invites`, `discord_join_guild` |
| Threads | `discord_create_thread`, `discord_archive_thread` |
| Emoji | `discord_create_emoji`, `discord_delete_emoji` |
| DMs | `discord_list_dms`, `discord_read_messages`, `discord_send_message` |

Every tool with its parameters is documented in [docs/tools.md](docs/tools.md).

## What is intentionally missing

Creating a DM with a user who is not already in the DM list, friend requests, username and password changes, and voice audio all need a captcha or an interactive client, or are outside the library. See [docs/capabilities.md](docs/capabilities.md) for the full list and the reason for each gap.

## Development

```sh
npm run typecheck
npm test        # unit tests against the built output
npm run smoke   # spawns the MCP server and lists tools
```

Layout:

```
src/
  index.ts        entry point, tool registration
  discord.ts      login, resolvers, guards
  config.ts       environment parsing
  format.ts       Discord object serializers
  util.ts         validation, permissions, result helpers
  tools/          one module per tool group
test/             unit and stdio smoke tests
docs/             setup, configuration, tool reference, security
```

## License

MIT. Upstream library is GPL-3.0, see [NOTICE](NOTICE).
