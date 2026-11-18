import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getClient } from '../discord.js';
import { serializeUser } from '../format.js';
import { snowflake, safely } from '../util.js';
import { z } from 'zod';

export function registerUserTools(server: McpServer): void {
  server.registerTool(
    'discord_get_user',
    {
      description: 'Look up a user by id.',
      inputSchema: { userId: snowflake },
    },
    async ({ userId }) =>
      safely(async () => {
        const client = await getClient();
        const user = client.users.cache.get(userId) ?? (await client.users.fetch(userId));
        return {
          ...serializeUser(user),
          avatarUrl: user.displayAvatarURL?.() ?? null,
          bannerUrl: (user as unknown as { bannerURL?: () => string | null }).bannerURL?.() ?? null,
        };
      })
  );

  server.registerTool(
    'discord_user_profile',
    {
      description: 'Fetch a user profile (bio, pronouns, mutual servers) as returned by Discord.',
      inputSchema: { userId: snowflake },
    },
    async ({ userId }) =>
      safely(async () => {
        const client = await getClient();
        const me = client.user as unknown as {
          fetchProfile(userId: string): Promise<Record<string, unknown>>;
        };
        const raw = await me.fetchProfile(userId);
        const profileUser = raw.user as { bio?: string; pronouns?: string; accent_color?: number } | undefined;
        const mutuals = raw.mutual_guilds as unknown;
        return {
          userId,
          bio: profileUser?.bio ?? null,
          pronouns: profileUser?.pronouns ?? null,
          accentColor: profileUser?.accent_color ?? null,
          mutualGuilds: mutuals ?? null,
        };
      })
  );
}
