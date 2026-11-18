import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient, requireAdmin, requireWrites, resolveChannel, resolveGuild } from '../discord.js';
import { serializeInvite } from '../format.js';
import { snowflake, safely } from '../util.js';

export function registerInviteTools(server: McpServer): void {
  server.registerTool(
    'discord_list_guild_invites',
    {
      description: 'List active invites of a server. Requires Manage Server.',
      inputSchema: { guildId: snowflake },
    },
    async ({ guildId }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        const invites = await guild.invites.fetch();
        return { count: invites.size, invites: invites.map((invite) => serializeInvite(invite)) };
      })
  );

  server.registerTool(
    'discord_create_invite',
    {
      description: 'Create an invite for a channel. Requires Create Invite.',
      inputSchema: {
        channelId: snowflake,
        maxAgeSeconds: z.number().int().min(0).max(604_800).default(86_400).describe('0 for never'),
        maxUses: z.number().int().min(0).max(100).default(0).describe('0 for unlimited'),
        temporary: z.boolean().default(false).describe('Kick users who never got a role'),
        unique: z.boolean().default(false),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ channelId, maxAgeSeconds, maxUses, temporary, unique, reason }) =>
      safely(async () => {
        requireWrites();
        const channel = await resolveChannel(channelId);
        if (!channel.createInvite) throw new Error(`Channel ${channelId} does not support invites.`);
        const invite = await channel.createInvite({
          maxAge: maxAgeSeconds,
          maxUses,
          temporary,
          unique,
          reason,
        });
        return serializeInvite(invite as never);
      })
  );

  server.registerTool(
    'discord_delete_invite',
    {
      description: 'Revoke an invite by code. Requires Manage Server.',
      inputSchema: {
        guildId: snowflake,
        code: z.string().min(2).max(64).describe('Invite code or trailing part of an invite URL'),
      },
    },
    async ({ guildId, code }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const invites = await guild.invites.fetch();
        const match = invites.find((invite) => invite.code === code || invite.url.endsWith(`/${code}`));
        if (!match) throw new Error(`Invite ${code} not found in guild ${guildId}.`);
        await match.delete();
        return { revoked: true, code: match.code };
      })
  );

  server.registerTool(
    'discord_join_guild',
    {
      description:
        'Join a server with an invite code. Requires confirm: true; the account stays joined until it leaves.',
      inputSchema: {
        code: z.string().min(2).max(64).describe('Invite code or full URL'),
        confirm: z.literal(true),
      },
    },
    async ({ code }) =>
      safely(async () => {
        requireWrites();
        const client = await getClient();
        const inviteCode = code.trim().split('/').filter(Boolean).pop() ?? code;
        const result = await (client as unknown as {
          acceptInvite(invite: string): Promise<{ id: string; name?: string; type?: string }>;
        }).acceptInvite(inviteCode);
        return { joined: true, id: result.id, name: result.name ?? null, type: result.type ?? null };
      })
  );
}
