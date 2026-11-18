# Configuration

All configuration is environment variables, read once at startup. Invalid values fail fast with a message on stderr.

| Variable | Default | Values | Meaning |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | none | string | User account token. Required. |
| `DISCORD_MCP_ALLOW_WRITE` | `1` | `1`/`0`, `true`/`false`, `yes`/`no`, `on`/`off` | Master switch for every tool that changes state. |
| `DISCORD_MCP_ALLOW_ADMIN` | `1` | same | Blocks moderation, roles, channel structure, server settings, emoji changes, invites deletion and leaving servers. |
| `DISCORD_MCP_GUILDS` | all | comma-separated ids | Allowlist of guild ids. Guild tools for other guilds fail before any request. |
| `DISCORD_MCP_LOGIN_TIMEOUT_MS` | `60000` | positive integer | How long a tool waits for the gateway login. |

## Modes

**Default** (`ALLOW_WRITE=1`, `ALLOW_ADMIN=1`): every tool works. Destructive tools still require `confirm: true`.

**Read-only** (`ALLOW_WRITE=0`): read, search, list and profile reads work. Sending, editing, reacting, joining, profile edits and admin actions fail with a clear message. Useful for summarizing channels and DMs.

**Write but not admin** (`ALLOW_WRITE=1`, `ALLOW_ADMIN=0`): messages, reactions, threads, typing, invites creation and profile edits are allowed. Kick, ban, timeout, role changes, channel create/edit/delete, permission overwrites, server rename, emoji changes and server leave are blocked.

**Scoped to servers**:

```sh
DISCORD_MCP_GUILDS=123456789012345678,987654321098765432
```

Guild ids are the numbers in the server URL. The allowlist also applies to guild tool calls reached through a channel or role id.

## Example: cautious setup

```json
{
  "mcp": {
    "discord": {
      "type": "local",
      "command": ["node", "/abs/path/dist/index.js"],
      "enabled": true,
      "environment": {
        "DISCORD_TOKEN": "your-token",
        "DISCORD_MCP_ALLOW_ADMIN": "0",
        "DISCORD_MCP_GUILDS": "123456789012345678"
      }
    }
  }
}
```

## Where the token lives

Discord tokens are account credentials, not scoped API keys. The MCP client stores them in a plaintext config file. Protect that file (`chmod 600`), never commit it, and prefer a config that reads the token from your shell environment when the client supports it.

## Logging

The server writes a single startup line to stderr: version and active modes. It never writes to stdout, because stdout is the MCP protocol stream. Tool results are the only output an agent sees.
