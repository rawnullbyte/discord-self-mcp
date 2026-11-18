import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { requireAdmin, resolveGuild } from '../discord.js';
import { snowflake, safely } from '../util.js';

export function registerEmojiTools(server: McpServer): void {
  server.registerTool(
    'discord_create_emoji',
    {
      description: 'Upload a custom emoji from an image URL or data URI. Requires Manage Expressions.',
      inputSchema: {
        guildId: snowflake,
        name: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_]+$/, 'use letters, digits and underscores only'),
        url: z.string().min(1).describe('https URL or data: URI of a PNG/JPG/GIF image'),
        roles: z.array(snowflake).default([]).describe('Role ids allowed to use the emoji; empty means everyone'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, name, url, roles, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const emoji = await guild.emojis.create(url, name, {
          roles,
          reason,
        } as never);
        return { created: true, id: emoji.id, name: emoji.name, animated: emoji.animated, url: emoji.url };
      })
  );

  server.registerTool(
    'discord_delete_emoji',
    {
      description: 'Delete a custom emoji. Requires Manage Expressions.',
      inputSchema: {
        guildId: snowflake,
        emojiId: snowflake,
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, emojiId, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const emoji = guild.emojis.cache.get(emojiId);
        const name = emoji?.name ?? null;
        await guild.emojis.delete(emojiId, reason);
        return { deleted: true, guildId, emojiId, name };
      })
  );
}
