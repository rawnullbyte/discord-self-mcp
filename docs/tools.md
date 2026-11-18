# Tool reference

80 tools. Every id parameter is a numeric Discord snowflake, validated before the request.

Legend: **write** changes account state (blocked by `DISCORD_MCP_ALLOW_WRITE=0`), **admin** changes server state (blocked by `DISCORD_MCP_ALLOW_ADMIN=0`).

## Account

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_whoami` | read | none | Id, username, tag, premium type, guild count, whether email/phone exists |
| `discord_account_profile` | read | none | Bio, pronouns, global name, accent color, avatar and banner URLs |
| `discord_list_friends` | read | none | Friends with optional nicknames |
| `discord_list_blocked` | read | none | Blocked users |
| `discord_list_friend_requests` | read | none | Incoming and outgoing requests; sending needs a captcha |
| `discord_set_status` | write | `status?`, `activity?`, `activityType?`, `url?`, `afk?` | Presence and activity |
| `discord_set_custom_status` | write | `text`, `emoji?`, `expiresInMinutes?` | Custom status text |
| `discord_clear_status` | write | none | Clears activity, back to online |
| `discord_set_about_me` | write | `bio` | Empty string clears |
| `discord_set_global_name` | write | `name` | Display name |
| `discord_set_pronouns` | write | `pronouns` | Empty string clears |
| `discord_set_avatar` | write | `url` | https URL or data URI |
| `discord_set_banner` | write | `url` | Empty string clears |
| `discord_set_accent_color` | write | `color?` | `0xRRGGBB` or `#RRGGBB`; omit to clear |

## Servers

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_list_guilds` | read | `query?`, `limit?` | Servers the account is in |
| `discord_guild_info` | read | `guildId` | Details, channels, roles |
| `discord_guild_member_me` | read | `guildId` | Account member object in that server |
| `discord_edit_guild` | admin | `guildId`, `name?`, `description?`, `reason?` | Requires Manage Server |
| `discord_leave_guild` | admin | `guildId`, `confirm` | Permanent |
| `discord_list_bans` | read | `guildId`, `limit?` | Requires Ban Members |
| `discord_ban_member` | admin | `guildId`, `userId`, `deleteMessageSeconds?`, `reason?` | Requires Ban Members |
| `discord_unban_member` | admin | `guildId`, `userId`, `reason?` | Requires Ban Members |
| `discord_list_audit_logs` | read | `guildId`, `limit?`, `actionType?`, `userId?`, `before?` | Requires View Audit Log |
| `discord_list_emojis` | read | `guildId`, `limit?` | Cached custom emoji |

## Channels

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_list_channels` | read | `guildId`, `query?`, `type?`, `limit?` | Types: `GUILD_TEXT`, `GUILD_VOICE`, `GUILD_CATEGORY`, `GUILD_ANNOUNCEMENT`, `GUILD_FORUM`, `GUILD_MEDIA`, `GUILD_STAGE_VOICE` |
| `discord_channel_info` | read | `channelId` | Channel, thread or DM |
| `discord_create_channel` | admin | `guildId`, `name`, `type?`, `parentId?`, `topic?`, `nsfw?`, `slowmodeSeconds?`, `position?`, `reason?` | Requires Manage Channels |
| `discord_edit_channel` | admin | `guildId`, `channelId`, `name?`, `topic?`, `nsfw?`, `slowmodeSeconds?`, `parentId?`, `position?`, `reason?` | Requires Manage Channels |
| `discord_delete_channel` | admin | `guildId`, `channelId`, `confirm`, `reason?` | Permanent |
| `discord_set_channel_position` | admin | `guildId`, `channelId`, `position` | Requires Manage Channels |
| `discord_list_permission_overwrites` | read | `guildId`, `channelId` | Allow and deny sets per role or member |
| `discord_edit_permission_overwrite` | admin | `guildId`, `channelId`, `targetType`, `targetId`, `allow?`, `deny?`, `reason?` | `targetType` is `role` or `member` |
| `discord_delete_permission_overwrite` | admin | `guildId`, `channelId`, `targetId`, `reason?` | Removes the overwrite |

## Messages

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_read_messages` | read | `channelId`, `limit?`, `before?`, `after?`, `around?` | Newest first, max 100 |
| `discord_get_message` | read | `channelId`, `messageId` | One message |
| `discord_search_messages` | read | `channelId`, `content`, `limit?`, `offset?`, `authorId?` | Discord search endpoint |
| `discord_send_message` | write | `channelId`, `content`, `replyToId?`, `tts?` | DM channels must already exist |
| `discord_edit_message` | write | `channelId`, `messageId`, `content` | Own messages |
| `discord_delete_message` | write | `channelId`, `messageId`, `confirm` | Own messages, or Manage Messages |
| `discord_list_pins` | read | `channelId` | Pinned messages |
| `discord_pin_message` | write | `channelId`, `messageId` | Requires Manage Messages |
| `discord_unpin_message` | write | `channelId`, `messageId` | Requires Manage Messages |
| `discord_react` | write | `channelId`, `messageId`, `emoji` | Unicode or `name:id` |
| `discord_remove_reaction` | write | `channelId`, `messageId`, `emoji` | Removes the account's own reaction |
| `discord_send_typing` | write | `channelId` | Typing indicator |
| `discord_list_reactions` | read | `channelId`, `messageId`, `limit?` | Who reacted with what |

## Members

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_list_members` | read | `guildId`, `limit?`, `query?`, `after?` | Search or page |
| `discord_get_member` | read | `guildId`, `userId` | Roles and computed permissions |
| `discord_add_role` | admin | `guildId`, `userId`, `roleIds`, `reason?` | Requires Manage Roles |
| `discord_remove_role` | admin | `guildId`, `userId`, `roleIds`, `reason?` | Requires Manage Roles |
| `discord_set_roles` | admin | `guildId`, `userId`, `roleIds`, `reason?` | Replaces the whole set |
| `discord_set_nickname` | write | `guildId`, `userId`, `nickname`, `reason?` | Null clears; own nickname needs Change Nickname |
| `discord_timeout_member` | admin | `guildId`, `userId`, `minutes`, `reason?` | Max 28 days |
| `discord_remove_timeout` | admin | `guildId`, `userId`, `reason?` | |
| `discord_kick_member` | admin | `guildId`, `userId`, `reason?` | Requires Kick Members |
| `discord_move_member` | admin | `guildId`, `userId`, `channelId`, `reason?` | Null disconnects from voice |
| `discord_set_server_mute` | admin | `guildId`, `userId`, `mute`, `reason?` | Requires Mute Members |
| `discord_set_server_deaf` | admin | `guildId`, `userId`, `deaf`, `reason?` | Requires Deafen Members |
| `discord_disconnect_member` | admin | `guildId`, `userId`, `reason?` | Requires Move Members |
| `discord_prune_members` | admin | `guildId`, `days?`, `dryRun?`, `reason?` | `dryRun` defaults to true |

## Roles

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_list_roles` | read | `guildId` | Color, position, permissions |
| `discord_create_role` | admin | `guildId`, `name`, `color?`, `hoist?`, `mentionable?`, `permissions?`, `reason?` | Requires Manage Roles |
| `discord_edit_role` | admin | `guildId`, `roleId`, `name?`, `color?`, `hoist?`, `mentionable?`, `permissions?`, `reason?` | `permissions` replaces the set |
| `discord_delete_role` | admin | `guildId`, `roleId`, `confirm`, `reason?` | Permanent |
| `discord_set_role_position` | admin | `guildId`, `roleId`, `position` | Cannot exceed the account's highest role |
| `discord_list_role_members` | read | `guildId`, `roleId` | Member ids only |

Permission names accept `SendMessages` or `SEND_MESSAGES`; both are normalized. Unknown names are rejected before the request.

## Invites

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_list_guild_invites` | read | `guildId` | Requires Manage Server |
| `discord_create_invite` | write | `channelId`, `maxAgeSeconds?`, `maxUses?`, `temporary?`, `unique?`, `reason?` | Requires Create Invite |
| `discord_delete_invite` | admin | `guildId`, `code` | Requires Manage Server |
| `discord_join_guild` | write | `code`, `confirm` | Joins until the account leaves |

## Threads

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_list_threads` | read | `channelId`, `archived?`, `limit?` | Active or archived |
| `discord_create_thread` | write | `channelId`, `name`, `private?`, `autoArchiveMinutes?`, `messageId?`, `reason?` | Durations: 60, 1440, 4320, 10080 |
| `discord_join_thread` | write | `threadId` | |
| `discord_leave_thread` | write | `threadId` | |
| `discord_archive_thread` | write | `threadId`, `archived?`, `locked?`, `reason?` | Requires Manage Threads to archive others' threads |

## Emoji

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_create_emoji` | admin | `guildId`, `name`, `url`, `roles?`, `reason?` | Requires Manage Expressions |
| `discord_delete_emoji` | admin | `guildId`, `emojiId`, `reason?` | Requires Manage Expressions |

## DMs and users

| Tool | Type | Parameters | Notes |
| --- | --- | --- | --- |
| `discord_list_dms` | read | `limit?`, `query?` | Only existing DM and group DM channels |
| `discord_get_user` | read | `userId` | Basic user data |
| `discord_user_profile` | read | `userId` | Bio, pronouns, mutual guilds |

DM conversations are read and written through the message tools with the DM channel id from `discord_list_dms`.
