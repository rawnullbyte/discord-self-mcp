import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAccount, getClient, requireWrites } from '../discord.js';
import { serializeUser } from '../format.js';
import { color, safely } from '../util.js';

const activityTypes = {
  Playing: 0,
  Streaming: 1,
  Listening: 2,
  Watching: 3,
  Custom: 4,
  Competing: 5,
} as const;

const statuses = ['online', 'idle', 'dnd', 'invisible', 'offline'] as const;

export function registerAccountTools(server: McpServer): void {
  server.registerTool(
    'discord_whoami',
    {
      description: 'Details of the logged-in account: id, username, tag, email availability, guild count.',
      inputSchema: {},
    },
    async () =>
      safely(async () => {
        const client = await getClient();
        const me = client.user as unknown as {
          tag?: string;
          email?: string | null;
          phone?: string | null;
          verified?: boolean;
          premiumType?: number;
          bio?: string;
          pronouns?: string;
        };
        return {
          user: serializeUser(client.user),
          tag: me.tag ?? null,
          verified: me.verified ?? null,
          hasEmail: Boolean(me.email),
          hasPhone: Boolean(me.phone),
          premiumType: me.premiumType ?? null,
          bio: me.bio ?? null,
          pronouns: me.pronouns ?? null,
          guilds: client.guilds.cache.size,
        };
      })
  );

  server.registerTool(
    'discord_account_profile',
    {
      description: 'Public profile fields of the logged-in account.',
      inputSchema: {},
    },
    async () =>
      safely(async () => {
        const me = (await getAccount()) as unknown as {
          bio?: string;
          pronouns?: string;
          globalName?: string | null;
          avatarURL?: (options?: Record<string, unknown>) => string | null;
          bannerURL?: (options?: Record<string, unknown>) => string | null;
          accentColor?: number | null;
        };
        return {
          user: serializeUser(await getAccount()),
          bio: me.bio ?? null,
          pronouns: me.pronouns ?? null,
          globalName: me.globalName ?? null,
          accentColor: me.accentColor ?? null,
          avatarUrl: me.avatarURL?.() ?? null,
          bannerUrl: me.bannerURL?.() ?? null,
        };
      })
  );

  server.registerTool(
    'discord_list_friends',
    {
      description: 'List friends of the account, with nicknames when set.',
      inputSchema: {},
    },
    async () =>
      safely(async () => {
        const client = await getClient();
        const relationships = client.relationships as unknown as {
          friendCache: Map<string, import('@discord-selfbot/core').User>;
          friendNicknames: Map<string, string | null>;
        };
        const friends = [...relationships.friendCache.values()].map((user) => ({
          ...serializeUser(user),
          nickname: relationships.friendNicknames.get(user.id) ?? null,
        }));
        return { count: friends.length, friends };
      })
  );

  server.registerTool(
    'discord_list_blocked',
    {
      description: 'List blocked users.',
      inputSchema: {},
    },
    async () =>
      safely(async () => {
        const client = await getClient();
        const relationships = client.relationships as unknown as {
          blockedCache: Map<string, import('@discord-selfbot/core').User>;
        };
        const users = [...relationships.blockedCache.values()].map((user) => serializeUser(user));
        return { count: users.length, blocked: users };
      })
  );

  server.registerTool(
    'discord_list_friend_requests',
    {
      description: 'List incoming and outgoing friend requests. Sending and accepting them needs a captcha and is not exposed.',
      inputSchema: {},
    },
    async () =>
      safely(async () => {
        const client = await getClient();
        const relationships = client.relationships as unknown as {
          incomingCache: Map<string, import('@discord-selfbot/core').User>;
          outgoingCache: Map<string, import('@discord-selfbot/core').User>;
        };
        return {
          incoming: [...relationships.incomingCache.values()].map((user) => serializeUser(user)),
          outgoing: [...relationships.outgoingCache.values()].map((user) => serializeUser(user)),
        };
      })
  );

  server.registerTool(
    'discord_set_status',
    {
      description: 'Set presence status, activity and custom status. Use discord_clear_status to reset.',
      inputSchema: {
        status: z.enum(statuses).optional().describe('Presence status'),
        activity: z.string().max(128).optional().describe('Activity name, for example "in Minecraft"'),
        activityType: z
          .enum(['Playing', 'Streaming', 'Listening', 'Watching', 'Competing'])
          .default('Playing')
          .describe('Activity verb'),
        url: z.string().url().optional().describe('Stream URL, required for Streaming activity'),
        afk: z.boolean().optional(),
      },
    },
    async ({ status, activity, activityType, url, afk }) =>
      safely(async () => {
        requireWrites();
        if (activityType === 'Streaming' && !url) throw new Error('Streaming activity requires a url.');
        if (activity !== undefined && activity.length < 1) throw new Error('activity cannot be empty.');
        const me = (await getAccount()) as unknown as { setPresence(value: unknown): unknown };
        const payload: Record<string, unknown> = {};
        if (status) payload.status = status;
        if (afk !== undefined) payload.afk = afk;
        if (activity) {
          payload.activities = [
            { name: activity, type: activityTypes[activityType], ...(url ? { url } : {}) },
          ];
        }
        me.setPresence(payload as never);
        return { updated: true, ...payload };
      })
  );

  server.registerTool(
    'discord_set_custom_status',
    {
      description: 'Set the custom status text and optional emoji.',
      inputSchema: {
        text: z.string().max(128).describe('Status text, empty string clears it'),
        emoji: z.string().max(64).optional().describe('Unicode emoji or name:id for a custom emoji'),
        expiresInMinutes: z.number().int().min(1).max(43_200).optional(),
      },
    },
    async ({ text, emoji, expiresInMinutes }) =>
      safely(async () => {
        requireWrites();
        const me = await getAccount();
        const expiresAt = expiresInMinutes
          ? new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
          : undefined;
        await (me as unknown as {
          setCustomStatus(value: Record<string, unknown>): Promise<unknown>;
        }).setCustomStatus({ text, emoji: emoji ?? null, ...(expiresAt ? { expires_at: expiresAt } : {}) });
        return { updated: true, text, emoji: emoji ?? null, expiresAt: expiresAt ?? null };
      })
  );

  server.registerTool(
    'discord_clear_status',
    {
      description: 'Clear activity and presence back to online.',
      inputSchema: {},
    },
    async () =>
      safely(async () => {
        requireWrites();
        const me = (await getAccount()) as unknown as { setPresence(value: unknown): unknown };
        me.setPresence({ status: 'online', activities: [] });
        return { updated: true };
      })
  );

  server.registerTool(
    'discord_set_about_me',
    {
      description: 'Set the account bio. Empty string clears it.',
      inputSchema: { bio: z.string().max(190) },
    },
    async ({ bio }) =>
      safely(async () => {
        requireWrites();
        const me = await getAccount();
        await (me as unknown as { setAboutMe(value: string | null): Promise<unknown> }).setAboutMe(bio || null);
        return { updated: true, bio };
      })
  );

  server.registerTool(
    'discord_set_global_name',
    {
      description: 'Set the display name (global name).',
      inputSchema: { name: z.string().min(1).max(32) },
    },
    async ({ name }) =>
      safely(async () => {
        requireWrites();
        const me = await getAccount();
        await (me as unknown as { setGlobalName(value: string): Promise<unknown> }).setGlobalName(name);
        return { updated: true, globalName: name };
      })
  );

  server.registerTool(
    'discord_set_pronouns',
    {
      description: 'Set profile pronouns. Empty string clears them.',
      inputSchema: { pronouns: z.string().max(40) },
    },
    async ({ pronouns }) =>
      safely(async () => {
        requireWrites();
        const me = await getAccount();
        await (me as unknown as { setPronouns(value: string | null): Promise<unknown> }).setPronouns(
          pronouns || null
        );
        return { updated: true, pronouns };
      })
  );

  server.registerTool(
    'discord_set_avatar',
    {
      description: 'Set the account avatar from an image URL or data URI.',
      inputSchema: { url: z.string().min(1).describe('https URL or data: URI of the image') },
    },
    async ({ url }) =>
      safely(async () => {
        requireWrites();
        const me = await getAccount();
        await (me as unknown as { setAvatar(value: string): Promise<unknown> }).setAvatar(url);
        return { updated: true };
      })
  );

  server.registerTool(
    'discord_set_banner',
    {
      description: 'Set the account banner from an image URL or data URI. Empty string clears it.',
      inputSchema: { url: z.string().describe('https URL, data: URI, or empty string to clear') },
    },
    async ({ url }) =>
      safely(async () => {
        requireWrites();
        const me = await getAccount();
        await (me as unknown as { setBanner(value: string | null): Promise<unknown> }).setBanner(
          url || null
        );
        return { updated: true };
      })
  );

  server.registerTool(
    'discord_set_accent_color',
    {
      description: 'Set the profile accent color.',
      inputSchema: { color: color.optional().describe('0xRRGGBB or #RRGGBB; omit to clear') },
    },
    async ({ color: input }) =>
      safely(async () => {
        requireWrites();
        const me = await getAccount();
        const value = input === undefined ? null : typeof input === 'number' ? input : Number.parseInt(input.replace(/^#/, ''), 16);
        await (me as unknown as { setAccentColor(value: number | null): Promise<unknown> }).setAccentColor(value);
        return { updated: true, accentColor: value };
      })
  );

}
