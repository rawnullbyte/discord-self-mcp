import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveGuild, resolveMember, requireAdmin, requireWrites } from '../discord.js';
import { serializeMember } from '../format.js';
import { snowflake, safely } from '../util.js';

const MAX_TIMEOUT_MINUTES = 28 * 24 * 60;

export function registerMemberTools(server: McpServer): void {
  server.registerTool(
    'discord_list_members',
    {
      description: 'List or search members of a server. Large servers need query or after paging.',
      inputSchema: {
        guildId: snowflake,
        limit: z.number().int().min(1).max(1000).default(50),
        query: z.string().optional().describe('Match username or nickname'),
        after: snowflake.optional().describe('Return members after this user id'),
      },
    },
    async ({ guildId, limit, query, after }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        const options: Record<string, unknown> = { limit };
        if (query) options.query = query;
        if (after) options.after = after;
        const members = await (
          guild.members as unknown as { fetch(options: object): Promise<import('@discord-selfbot/core').Collection<string, import('@discord-selfbot/core').GuildMember>> }
        ).fetch(options);
        return {
          count: members.size,
          members: [...members.values()].map((member) => serializeMember(member)),
        };
      })
  );

  server.registerTool(
    'discord_get_member',
    {
      description: 'Get one member of a server, including roles and computed permissions.',
      inputSchema: { guildId: snowflake, userId: snowflake },
    },
    async ({ guildId, userId }) =>
      safely(async () => serializeMember(await resolveMember(guildId, userId)))
  );

  server.registerTool(
    'discord_add_role',
    {
      description: 'Add one or more roles to a member. Requires Manage Roles and a role below the account highest role.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        roleIds: z.array(snowflake).min(1).max(20),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, roleIds, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        const updated = await (member.roles as unknown as {
          add(roles: string[], reason?: string): Promise<unknown>;
        }).add(roleIds, reason);
        return serializeMember(updated as never);
      })
  );

  server.registerTool(
    'discord_remove_role',
    {
      description: 'Remove one or more roles from a member. Requires Manage Roles.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        roleIds: z.array(snowflake).min(1).max(20),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, roleIds, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        const updated = await (member.roles as unknown as {
          remove(roles: string[], reason?: string): Promise<unknown>;
        }).remove(roleIds, reason);
        return serializeMember(updated as never);
      })
  );

  server.registerTool(
    'discord_set_roles',
    {
      description: 'Replace all roles of a member. Requires Manage Roles.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        roleIds: z.array(snowflake).max(50).describe('Full role set; use [] to remove every role'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, roleIds, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        const updated = await (member.roles as unknown as {
          set(roles: string[], reason?: string): Promise<unknown>;
        }).set(roleIds, reason);
        return serializeMember(updated as never);
      })
  );

  server.registerTool(
    'discord_set_nickname',
    {
      description: 'Change a member nickname, or clear it with null. Requires Manage Nicknames.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        nickname: z.string().max(32).nullable(),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, nickname, reason }) =>
      safely(async () => {
        requireWrites();
        const member = await resolveMember(guildId, userId);
        const updated = await member.setNickname(nickname, reason);
        return serializeMember(updated);
      })
  );

  server.registerTool(
    'discord_timeout_member',
    {
      description: 'Put a member in timeout. Requires Moderate Members. Maximum 28 days.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        minutes: z.number().int().min(1).max(MAX_TIMEOUT_MINUTES).describe('Timeout length in minutes'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, minutes, reason }) =>
      safely(async () => {
        requireAdmin();
        if (minutes > MAX_TIMEOUT_MINUTES) throw new Error('Timeout cannot exceed 28 days.');
        const member = await resolveMember(guildId, userId);
        const updated = await member.timeout(minutes * 60_000, reason);
        return serializeMember(updated);
      })
  );

  server.registerTool(
    'discord_remove_timeout',
    {
      description: 'Remove a member timeout.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        const updated = await member.timeout(null, reason);
        return serializeMember(updated);
      })
  );

  server.registerTool(
    'discord_kick_member',
    {
      description: 'Kick a member from the server. Requires Kick Members.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        await member.kick(reason);
        return { kicked: true, guildId, userId, reason: reason ?? null };
      })
  );

  server.registerTool(
    'discord_move_member',
    {
      description: 'Move a member to another voice channel, or disconnect them with channelId null. Requires Move Members.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        channelId: snowflake.nullable(),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, channelId, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        const voice = member.voice as unknown as {
          channelId: string | null;
          setChannel(channel: string | null, reason?: string): Promise<unknown>;
        };
        await voice.setChannel(channelId, reason);
        return { moved: true, guildId, userId, from: voice.channelId, to: channelId };
      })
  );

  server.registerTool(
    'discord_set_server_mute',
    {
      description: 'Server mute or unmute a member in voice. Requires Mute Members.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        mute: z.boolean(),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, mute, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        const voice = member.voice as unknown as {
          setMute(value: boolean, reason?: string): Promise<unknown>;
        };
        const updated = await voice.setMute(mute, reason);
        return serializeMember(updated as never);
      })
  );

  server.registerTool(
    'discord_set_server_deaf',
    {
      description: 'Server deafen or undeafen a member in voice. Requires Deafen Members.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        deaf: z.boolean(),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, deaf, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        const voice = member.voice as unknown as {
          setDeaf(value: boolean, reason?: string): Promise<unknown>;
        };
        const updated = await voice.setDeaf(deaf, reason);
        return serializeMember(updated as never);
      })
  );

  server.registerTool(
    'discord_disconnect_member',
    {
      description: 'Disconnect a member from voice. Requires Move Members.',
      inputSchema: {
        guildId: snowflake,
        userId: snowflake,
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, userId, reason }) =>
      safely(async () => {
        requireAdmin();
        const member = await resolveMember(guildId, userId);
        const voice = member.voice as unknown as { disconnect(reason?: string): Promise<unknown> };
        await voice.disconnect(reason);
        return { disconnected: true, guildId, userId };
      })
  );

  server.registerTool(
    'discord_prune_members',
    {
      description: 'Preview or run a member prune by inactivity. Members with roles are never pruned by Discord.',
      inputSchema: {
        guildId: snowflake,
        days: z.number().int().min(1).max(30).default(7),
        dryRun: z.boolean().default(true),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, days, dryRun, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        if (dryRun) {
          const count = await guild.members.prune({ days, dry: true, count: true });
          return { dryRun: true, days, wouldPrune: count };
        }
        await guild.members.prune({ days, dry: false, count: false, reason });
        return { dryRun: false, days };
      })
  );
}
