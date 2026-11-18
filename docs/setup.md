# Setup

## Requirements

- Node.js 22 or newer (`node -v`).
- A Discord user token. Token extraction is outside the scope of this project; see [security.md](security.md) first.
- Telegram, a second account, or an alt you can lose. Selfbots break Discord's Terms of Service.

## Build

```sh
git clone https://github.com/rawnullbyte/discord-self-mcp.git
cd discord-self-mcp
npm install
npm run build
```

The build writes `dist/index.js`. That file is the MCP entry point.

## Verify it runs

```sh
DISCORD_TOKEN=your-token node dist/index.js
```

A working server prints one line to stderr (writes=on, admin=on, ...) and then waits. It speaks JSON-RPC on stdin/stdout, so running it in a terminal looks idle. Ctrl+C to stop.

Without `DISCORD_TOKEN` it exits with code 1 and a message on stderr.

## OpenCode

Edit `~/.config/opencode/opencode.json` (or `opencode.jsonc`):

```json
{
  "mcp": {
    "discord": {
      "type": "local",
      "command": ["node", "/absolute/path/to/discord-self-mcp/dist/index.js"],
      "enabled": true,
      "environment": {
        "DISCORD_TOKEN": "your-user-token",
        "DISCORD_MCP_ALLOW_ADMIN": "0"
      }
    }
  }
}
```

Restart OpenCode, then ask the agent to call `discord_whoami`.

## Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["/absolute/path/to/discord-self-mcp/dist/index.js"],
      "env": {
        "DISCORD_TOKEN": "your-user-token"
      }
    }
  }
}
```

## Cursor, Zed, other clients

Any stdio MCP client works. The server needs no arguments and no working directory assumptions beyond Node resolving its dependencies. If a client supports `cwd`, point it at the repository root.

## npx without a global install

```json
"command": ["npx", "-y", "/absolute/path/to/discord-self-mcp"]
```

npm installs the folder into its cache and runs the `discord-self-mcp` bin. This re-resolves the local path on each start, so rebuild after edits.

## Published package

If you publish your own scope (see [publishing.md](publishing.md)):

```json
"command": ["npx", "-y", "@yourscope/discord-self-mcp"]
```

Bare `npx -y discord-self-mcp` resolves to an unrelated package on npm, not this code.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Server exits immediately, code 1 | `DISCORD_TOKEN` missing | Add it to the client `environment`/`env` block |
| `An invalid token was provided` | Wrong or revoked token | Re-extract the token, revoke the old one |
| Login times out | Discord blocked the login, or the network needs a proxy | Retry, use a residential IP, raise `DISCORD_MCP_LOGIN_TIMEOUT_MS` |
| Tools return permission errors | The account lacks the permission | Check the account roles in that server |
| `Unknown permission "..."` | Typo in a permission name | Use names like `ViewChannel`, `SendMessages`, `ManageRoles` |
| Agent cannot see a DM channel | DM not in the account channel cache | Run `discord_list_dms`; new DMs need a captcha |
| `Missing Access` on a guild channel | Channel overwrites hide it | Give the account access or use another channel |

Logs go to stderr only. Redirect them to a file when debugging:

```sh
DISCORD_TOKEN=... node dist/index.js 2> mcp.log
```
