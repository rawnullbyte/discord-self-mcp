import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveChannel, resolveGuild, requireAdmin } from '../discord.js';
import { serializeChannel, serializeOverwrite } from '../format.js';
import { permissionOverwrites, snowflake, safely } from '../util.js';

const channelTypes = [
  'GUILD_TEXT',
  'GUILD_VOICE',
  'GUILD_CATEGORY',
  'GUILD_ANNOUNCEMENT',
  'GUILD_FORUM',
  'GUILD_MEDIA',
  'GUILD_STAGE_VOICE',
] as const;

export function registerChannelTools(server: McpServer): void {
  server.registerTool(
    'discord_list_channels',
    {
      description: 'List channels of a server, filtered by name or type.',
      inputSchema: {
        guildId: snowflake,
        query: z.string().optional().describe('Case-insensitive substring of the channel name'),
        type: z.enum(channelTypes).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      },
    },
    async ({ guildId, query, type, limit }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        const needle = query?.toLowerCase();
        const channels = guild.channels.cache
          .filter((channel) => {
            if (type && String(channel.type) !== type) return false;
            if (!needle) return true;
            const name = (channel as { name?: string | null }).name ?? '';
            return name.toLowerCase().includes(needle);
          })
          .first(limit)
          .map((channel) => serializeChannel(channel as never));
        return { count: channels.length, channels };
      })
  );

  server.registerTool(
    'discord_channel_info',
    {
      description: 'Details of a channel, thread or DM by id.',
      inputSchema: { channelId: snowflake },
    },
    async ({ channelId }) =>
      safely(async () => {
        const channel = await resolveChannel(channelId);
        return serializeChannel(channel);
      })
  );

  server.registerTool(
    'discord_create_channel',
    {
      description: 'Create a channel or category. Requires Manage Channels.',
      inputSchema: {
        guildId: snowflake,
        name: z.string().min(1).max(100),
        type: z.enum(channelTypes).default('GUILD_TEXT'),
        parentId: snowflake.optional().describe('Category to place the channel in'),
        topic: z.string().max(1024).optional(),
        nsfw: z.boolean().optional(),
        slowmodeSeconds: z.number().int().min(0).max(21_600).optional(),
        position: z.number().int().min(0).optional(),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, name, type, parentId, topic, nsfw, slowmodeSeconds, position, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const options: Record<string, unknown> = { type };
        if (parentId) options.parent = parentId;
        if (topic !== undefined) options.topic = topic;
        if (nsfw !== undefined) options.nsfw = nsfw;
        if (slowmodeSeconds !== undefined) options.rateLimitPerUser = slowmodeSeconds;
        if (position !== undefined) options.position = position;
        if (reason) options.reason = reason;
        const channel = await guild.channels.create(name, options as never);
        return serializeChannel(channel as never);
      })
  );

  server.registerTool(
    'discord_edit_channel',
    {
      description: 'Rename a channel, change its topic, slowmode, NSFW flag, category or position.',
      inputSchema: {
        guildId: snowflake,
        channelId: snowflake,
        name: z.string().min(1).max(100).optional(),
        topic: z.string().max(1024).nullable().optional(),
        nsfw: z.boolean().optional(),
        slowmodeSeconds: z.number().int().min(0).max(21_600).optional(),
        parentId: snowflake.nullable().optional().describe('Move to this category, null to remove'),
        position: z.number().int().min(0).optional(),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, channelId, name, topic, nsfw, slowmodeSeconds, parentId, position, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (topic !== undefined) data.topic = topic;
        if (nsfw !== undefined) data.nsfw = nsfw;
        if (slowmodeSeconds !== undefined) data.rateLimitPerUser = slowmodeSeconds;
        if (parentId !== undefined) data.parent = parentId;
        if (position !== undefined) data.position = position;
        if (Object.keys(data).length === 0) throw new Error('Provide at least one field to change.');
        const channel = await guild.channels.edit(channelId, data as never, reason);
        return serializeChannel(channel as never);
      })
  );

  server.registerTool(
    'discord_delete_channel',
    {
      description: 'Delete a channel or category. Requires confirm: true.',
      inputSchema: {
        guildId: snowflake,
        channelId: snowflake,
        confirm: z.literal(true).describe('Must be true. Deletion cannot be undone.'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, channelId, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const name = (guild.channels.cache.get(channelId) as { name?: string } | undefined)?.name ?? null;
        await guild.channels.delete(channelId, reason);
        return { deleted: true, channelId, name };
      })
  );

  server.registerTool(
    'discord_set_channel_position',
    {
      description: 'Move a channel to a position inside its category.',
      inputSchema: {
        guildId: snowflake,
        channelId: snowflake,
        position: z.number().int().min(0).max(500),
      },
    },
    async ({ guildId, channelId, position }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const updated = await guild.channels.setPositions([{ channel: channelId, position }]);
        return { moved: true, channelId, position, guildId: updated.id };
      })
  );

  server.registerTool(
    'discord_list_permission_overwrites',
    {
      description: 'List role and member permission overwrites of a guild channel.',
      inputSchema: { guildId: snowflake, channelId: snowflake },
    },
    async ({ guildId, channelId }) =>
      safely(async () => {
        await resolveGuild(guildId);
        const channel = await resolveChannel(channelId);
        const manager = (channel as { permissionOverwrites?: { cache: Map<string, unknown> } })
          .permissionOverwrites;
        if (!manager) throw new Error('Channel has no permission overwrites.');
        const overwrites = [...manager.cache.values()].map((value) => serializeOverwrite(value as never));
        return { count: overwrites.length, overwrites };
      })
  );

  server.registerTool(
    'discord_edit_permission_overwrite',
    {
      description: 'Allow or deny permissions for a role or member on one channel.',
      inputSchema: {
        guildId: snowflake,
        channelId: snowflake,
        targetType: z.enum(['role', 'member']),
        targetId: snowflake,
        allow: z.array(z.string()).default([]).describe('Permission names to allow, for example ViewChannel'),
        deny: z.array(z.string()).default([]).describe('Permission names to deny'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, channelId, targetType, targetId, allow, deny, reason }) =>
      safely(async () => {
        requireAdmin();
        await resolveGuild(guildId);
        const options = permissionOverwrites(allow, deny);
        const channel = (await resolveChannel(channelId)) as unknown as {
          permissionOverwrites?: { edit(target: unknown, options: unknown, extra?: unknown): Promise<unknown> };
        };
        if (!channel.permissionOverwrites) throw new Error(`Channel ${channelId} has no permission overwrites.`);
        await channel.permissionOverwrites.edit(targetId, options, { type: targetType, reason });
        return { updated: true, channelId, targetId, targetType, allow, deny };
      })
  );

  server.registerTool(
    'discord_delete_permission_overwrite',
    {
      description: 'Remove the permission overwrite for a role or member on one channel.',
      inputSchema: {
        guildId: snowflake,
        channelId: snowflake,
        targetId: snowflake,
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, channelId, targetId, reason }) =>
      safely(async () => {
        requireAdmin();
        await resolveGuild(guildId);
        const channel = (await resolveChannel(channelId)) as unknown as {
          permissionOverwrites?: { delete(target: string, reason?: string): Promise<void> };
        };
        if (!channel.permissionOverwrites) throw new Error(`Channel ${channelId} has no permission overwrites.`);
        await channel.permissionOverwrites.delete(targetId, reason);
        return { deleted: true, channelId, targetId };
      })
  );
}
