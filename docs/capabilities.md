# What this server can and cannot do

A Discord user account can do almost everything through Discord's private API, but some actions are gated by a captcha, a password prompt, or the official client. This MCP server exposes the captcha-free surface. Tools that would need a captcha fail with an explicit message instead of silently breaking.

## Supported

- Account: presence, activity, custom status, bio, pronouns, global name, avatar, banner, accent color.
- Friends and blocks: read-only lists.
- Servers: list, inspect, rename, description, leave, audit log, bans.
- Channels: list, inspect, create, edit, delete, reorder, permission overwrites for roles and members.
- Messages: read, search, send, reply, edit, delete, pin, unpin, react, unreact, typing, list reactions.
- Members: list, search, inspect, nickname, roles add/remove/replace, timeout, kick, voice move, server mute/deafen, disconnect, prune.
- Roles: list, create, edit, delete, reorder, member lookup.
- Invites: list, create, revoke, join a server from a code.
- Threads: list, create, join, leave, archive, lock.
- Emoji: list, create from URL, delete.
- DMs: list existing conversations, read, send to them.
- User lookup: basic profile and profile extras.

## Not supported, and why

| Action | Reason |
| --- | --- |
| Sending or accepting friend requests | Captcha. The library rejects relationship mutations on purpose. |
| DMing a user not in the DM list | Opening the DM channel triggers a captcha. Sending to an existing DM works. |
| Unblocking or removing a friend | Same captcha-gated relationship endpoints. |
| Changing username, password, email, phone or 2FA | Needs the password and a verified session; changes can lock the account. |
| Joining by server discovery, boosting, Nitro purchase | Billing and anti-fraud paths; no safe API surface. |
| Voice audio: joining voice, speaking, streaming, recording | Needs voice codecs and audio devices; not covered here. Voice moderation actions are supported. |
| Forum posts and forum tags | Different thread payload and tag API; not implemented. |
| Webhooks, scheduled events, stage instances, stickers | Not implemented; see CONTRIBUTING if you need them. |
| Bulk message delete | The upstream message manager has no bulk delete; delete one at a time. |
| Server-wide message search | No supported endpoint; `discord_search_messages` searches inside one channel. |

## Consequences to keep in mind

- Every call runs as your account, with your permissions. There is no separate bot identity and no bot label on anything you do.
- Rate limits apply per account; a runaway agent loop can get a temporary block.
- Messages you send are real and visible. Writes can be disabled globally with `DISCORD_MCP_ALLOW_WRITE=0`.
- Deletions and kicks are not reversible. Admin actions are gated by `DISCORD_MCP_ALLOW_ADMIN` and destructive tools require `confirm: true`.
- The account token is a full credential. See [security.md](security.md).
