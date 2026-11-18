import type { GuildAuditLogsEntry } from '@discord-selfbot/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient, requireAdmin, requireWrites, resolveGuild } from '../discord.js';
import { serializeAuditEntry, serializeBan, serializeGuild, serializeMember, serializeRole } from '../format.js';
import { snowflake, safely } from '../util.js';

export function registerGuildTools(server: McpServer): void {
  server.registerTool(
    'discord_list_guilds',
    {
      description: 'List servers the account is a member of.',
      inputSchema: {
        query: z.string().optional().describe('Case-insensitive substring of the server name'),
        limit: z.number().int().min(1).max(200).default(100),
      },
    },
    async ({ query, limit }) =>
      safely(async () => {
        const client = await getClient();
        const needle = query?.toLowerCase();
        const guilds = client.guilds.cache
          .filter((guild) => (needle ? guild.name.toLowerCase().includes(needle) : true))
          .first(limit)
          .map((guild) => serializeGuild(guild));
        return { total: client.guilds.cache.size, count: guilds.length, guilds };
      })
  );

  server.registerTool(
    'discord_guild_info',
    {
      description: 'Server details with channels, roles and emoji summary.',
      inputSchema: { guildId: snowflake },
    },
    async ({ guildId }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        return {
          ...serializeGuild(guild),
          channels: guild.channels.cache.map((channel) => ({
            id: channel.id,
            name: (channel as { name?: string | null }).name ?? null,
            type: String(channel.type),
            parentId: (channel as { parentId?: string | null }).parentId ?? null,
          })),
          roles: guild.roles.cache.map((role) => serializeRole(role)),
        };
      })
  );

  server.registerTool(
    'discord_edit_guild',
    {
      description: 'Rename the server or change its description. Requires Manage Server.',
      inputSchema: {
        guildId: snowflake,
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(300).nullable().optional(),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, name, description, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (Object.keys(data).length === 0) throw new Error('Provide name or description.');
        const updated = await guild.edit(data as never, reason);
        return serializeGuild(updated);
      })
  );

  server.registerTool(
    'discord_leave_guild',
    {
      description: 'Leave a server permanently. Requires confirm: true.',
      inputSchema: {
        guildId: snowflake,
        confirm: z.literal(true).describe('Must be true. Leaving cannot be undone without a new invite.'),
      },
    },
    async ({ guildId }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const name = guild.name;
        await guild.leave();
        return { left: true, guildId, name };
      })
  );

  server.registerTool(
    'discord_list_bans',
    {
      description: 'List banned users. Requires Ban Members.',
      inputSchema: {
        guildId: snowflake,
        limit: z.number().int().min(1).max(1000).default(100),
      },
    },
    async ({ guildId, limit }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        const bans = await guild.bans.fetch({ limit });
        return { count: bans.size, bans: bans.map((ban) => serializeBan(ban)) };
      })
  );

  server.registerTool(
    'discord_ban_member',
    {
      description: 'Ban a user from a server. Requires Ban Members.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        deleteMessageSeconds: z.number().int().min(0).max(604_800).default(0).describe('Delete this many seconds of recent messages'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, deleteMessageSeconds, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        await guild.bans.create(userId, { deleteMessageSeconds, reason });
        return { banned: true, guildId, userId, deleteMessageSeconds, reason: reason ?? null };
      })
  );

  server.registerTool(
    'discord_unban_member',
    {
      description: 'Remove a ban. Requires Ban Members.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        await guild.bans.remove(userId, reason);
        return { unbanned: true, guildId, userId };
      })
  );

  server.registerTool(
    'discord_list_audit_logs',
    {
      description: 'Read recent audit log entries. Requires View Audit Log.',
      inputSchema: {
        guildId: snowflake,
        limit: z.number().int().min(1).max(100).default(25),
        actionType: z
          .string()
          .optional()
          .describe('Audit log action name, for example MEMBER_ROLE_UPDATE, MESSAGE_DELETE, CHANNEL_CREATE'),
        userId: snowflake.optional().describe('Only entries by this actor'),
        before: snowflake.optional(),
      },
    },
    async ({ guildId, limit, actionType, userId, before }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        const logs = await guild.fetchAuditLogs({
          limit,
          ...(actionType ? { type: actionType as never } : {}),
          ...(userId ? { user: userId } : {}),
          ...(before ? { before } : {}),
        } as never);
        const entries = [...logs.entries.values()] as GuildAuditLogsEntry[];
        return { count: entries.length, entries: entries.map((entry) => serializeAuditEntry(entry)) };
      })
  );

  server.registerTool(
    'discord_list_emojis',
    {
      description: 'List custom emoji of a server.',
      inputSchema: { guildId: snowflake, limit: z.number().int().min(1).max(500).default(100) },
    },
    async ({ guildId, limit }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        const emojis = guild.emojis.cache.first(limit).map((emoji) => ({
          id: emoji.id,
          name: emoji.name,
          animated: emoji.animated,
          url: emoji.url ?? null,
          managed: emoji.managed ?? false,
        }));
        return { count: emojis.length, emojis };
      })
  );

  server.registerTool(
    'discord_guild_member_me',
    {
      description: 'The account member object in a server: nickname, roles and computed permissions.',
      inputSchema: { guildId: snowflake },
    },
    async ({ guildId }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        const me = guild.members.me ?? (await guild.members.fetchMe());
        return serializeMember(me);
      })
  );
}
