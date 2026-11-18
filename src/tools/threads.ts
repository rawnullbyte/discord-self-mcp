import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { requireWrites, resolveChannel } from '../discord.js';
import { serializeThread } from '../format.js';
import { snowflake, safely } from '../util.js';

const archiveDurations = [60, 1440, 4320, 10080] as const;

export function registerThreadTools(server: McpServer): void {
  server.registerTool(
    'discord_list_threads',
    {
      description: 'List active or archived threads of a channel.',
      inputSchema: {
        channelId: snowflake,
        archived: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(50),
      },
    },
    async ({ channelId, archived, limit }) =>
      safely(async () => {
        const channel = await resolveChannel(channelId);
        if (!channel.threads) throw new Error(`Channel ${channelId} does not support threads.`);
        const result = archived
          ? await channel.threads.fetchArchived({ limit })
          : await channel.threads.fetchActive();
        const threads = [...result.threads.values()].slice(0, limit).map((thread) => serializeThread(thread as never));
        return { count: threads.length, archived, threads };
      })
  );

  server.registerTool(
    'discord_create_thread',
    {
      description: 'Create a public or private thread in a text channel. Requires Create Public Threads or Create Private Threads.',
      inputSchema: {
        channelId: snowflake,
        name: z.string().min(1).max(100),
        private: z.boolean().default(false),
        autoArchiveMinutes: z
          .union([z.literal(60), z.literal(1440), z.literal(4320), z.literal(10080)])
          .default(1440)
          .describe('Thread auto archive duration'),
        messageId: snowflake.optional().describe('Start the thread from this message'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ channelId, name, private: isPrivate, autoArchiveMinutes, messageId, reason }) =>
      safely(async () => {
        requireWrites();
        if (!archiveDurations.includes(autoArchiveMinutes)) {
          throw new Error('autoArchiveMinutes must be one of 60, 1440, 4320 or 10080.');
        }
        const channel = await resolveChannel(channelId);
        if (!channel.threads) throw new Error(`Channel ${channelId} does not support threads.`);
        const thread = await channel.threads.create({
          name,
          autoArchiveDuration: autoArchiveMinutes,
          type: isPrivate ? 12 : 11,
          ...(messageId ? { startMessage: messageId } : {}),
          reason,
        });
        return serializeThread(thread as never);
      })
  );

  server.registerTool(
    'discord_join_thread',
    {
      description: 'Join a thread.',
      inputSchema: { threadId: snowflake },
    },
    async ({ threadId }) =>
      safely(async () => {
        requireWrites();
        const thread = await resolveChannel(threadId);
        if (!thread.join) throw new Error(`Channel ${threadId} is not a thread.`);
        await thread.join();
        return { joined: true, threadId };
      })
  );

  server.registerTool(
    'discord_leave_thread',
    {
      description: 'Leave a thread.',
      inputSchema: { threadId: snowflake },
    },
    async ({ threadId }) =>
      safely(async () => {
        requireWrites();
        const thread = await resolveChannel(threadId);
        if (!thread.leave) throw new Error(`Channel ${threadId} is not a thread.`);
        await thread.leave();
        return { left: true, threadId };
      })
  );

  server.registerTool(
    'discord_archive_thread',
    {
      description: 'Archive or unarchive a thread. Requires Manage Threads.',
      inputSchema: {
        threadId: snowflake,
        archived: z.boolean().default(true),
        locked: z.boolean().optional().describe('Also lock or unlock the thread'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ threadId, archived, locked, reason }) =>
      safely(async () => {
        requireWrites();
        const thread = await resolveChannel(threadId);
        if (!thread.setArchived) throw new Error(`Channel ${threadId} is not a thread.`);
        await thread.setArchived(archived, locked, reason);
        return { threadId, archived, locked: locked ?? null };
      })
  );
}
