import type { Message } from '@discord-selfbot/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  fetchMessage,
  getClient,
  requireWrites,
  resolveChannel,
  resolveMessageTarget,
  type AnyChannel,
  type MessageManagerLike,
} from '../discord.js';
import { serializeMessage, serializeUser } from '../format.js';
import { snowflake, safely } from '../util.js';

function messageManager(channel: AnyChannel): MessageManagerLike {
  if (!channel.messages) throw new Error(`Channel ${channel.id} does not support messages.`);
  return channel.messages;
}

export function registerMessageTools(server: McpServer): void {
  server.registerTool(
    'discord_read_messages',
    {
      description: 'Fetch recent messages from a channel or existing DM, newest first.',
      inputSchema: {
        channelId: snowflake,
        limit: z.number().int().min(1).max(100).default(25),
        before: snowflake.optional().describe('Only messages older than this message id'),
        after: snowflake.optional().describe('Only messages newer than this message id'),
        around: snowflake.optional().describe('Messages around this message id'),
      },
    },
    async ({ channelId, limit, before, after, around }) =>
      safely(async () => {
        if ([before, after, around].filter(Boolean).length > 1) {
          throw new Error('Use only one of before, after or around.');
        }
        const channel = await resolveChannel(channelId);
        const messages = await messageManager(channel).fetch({
          limit,
          ...(before ? { before } : {}),
          ...(after ? { after } : {}),
          ...(around ? { around } : {}),
        });
        return { count: messages.size, channelId, messages: [...messages.values()].map(serializeMessage) };
      })
  );

  server.registerTool(
    'discord_get_message',
    {
      description: 'Fetch one message by id.',
      inputSchema: { channelId: snowflake, messageId: snowflake },
    },
    async ({ channelId, messageId }) =>
      safely(async () => {
        const channel = await resolveChannel(channelId);
        return serializeMessage(await fetchMessage(channel, messageId));
      })
  );

  server.registerTool(
    'discord_search_messages',
    {
      description: 'Search messages in a channel by text, optionally from one author.',
      inputSchema: {
        channelId: snowflake,
        content: z.string().min(1).describe('Text to search for'),
        limit: z.number().int().min(1).max(25).default(10),
        offset: z.number().int().min(0).max(5000).default(0),
        authorId: snowflake.optional(),
      },
    },
    async ({ channelId, content, limit, offset, authorId }) =>
      safely(async () => {
        const channel = await resolveChannel(channelId);
        const manager = messageManager(channel);
        if (!manager.search) throw new Error(`Channel ${channelId} does not support search.`);
        const result = await manager.search({
          content,
          limit,
          offset,
          ...(authorId ? { authors: [authorId] } : {}),
          sortBy: 'timestamp',
          sortOrder: 'desc',
        });
        return {
          total: result.total,
          channelId,
          messages: [...result.messages.values()].map(serializeMessage),
        };
      })
  );

  server.registerTool(
    'discord_send_message',
    {
      description:
        'Send a message to a channel or an existing DM. Replying needs only replyToId. Sending to a DM user who is not already in the DM list needs a captcha and is not supported.',
      inputSchema: {
        channelId: snowflake,
        content: z.string().min(1).max(4000),
        replyToId: snowflake.optional(),
        tts: z.boolean().optional(),
      },
    },
    async ({ channelId, content, replyToId, tts }) =>
      safely(async () => {
        requireWrites();
        const channel = await resolveMessageTarget(channelId);
        if (!channel.send) throw new Error(`Channel ${channelId} cannot receive messages.`);
        const payload: Record<string, unknown> = { content };
        if (tts) payload.tts = true;
        if (replyToId) payload.reply = { messageReference: replyToId, failIfNotExists: false };
        const message = await channel.send(payload);
        return serializeMessage(message);
      })
  );

  server.registerTool(
    'discord_edit_message',
    {
      description: 'Edit a message the account sent.',
      inputSchema: {
        channelId: snowflake,
        messageId: snowflake,
        content: z.string().max(4000),
      },
    },
    async ({ channelId, messageId, content }) =>
      safely(async () => {
        requireWrites();
        const channel = await resolveChannel(channelId);
        const message = await fetchMessage(channel, messageId);
        const edited = await (message as unknown as { edit(value: string): Promise<Message> }).edit(content);
        return serializeMessage(edited);
      })
  );

  server.registerTool(
    'discord_delete_message',
    {
      description: 'Permanently delete a message. Requires confirm: true.',
      inputSchema: {
        channelId: snowflake,
        messageId: snowflake,
        confirm: z.literal(true).describe('Must be true. Deletion cannot be undone.'),
      },
    },
    async ({ channelId, messageId }) =>
      safely(async () => {
        requireWrites();
        const channel = await resolveChannel(channelId);
        const message = await fetchMessage(channel, messageId);
        await (message as unknown as { delete(): Promise<Message> }).delete();
        return { deleted: true, channelId, messageId };
      })
  );

  server.registerTool(
    'discord_list_pins',
    {
      description: 'List pinned messages in a channel.',
      inputSchema: { channelId: snowflake },
    },
    async ({ channelId }) =>
      safely(async () => {
        const channel = await resolveChannel(channelId);
        const manager = messageManager(channel);
        if (!manager.fetchPinned) throw new Error(`Channel ${channelId} does not support pins.`);
        const pinned = await manager.fetchPinned();
        return { count: pinned.size, pins: [...pinned.values()].map(serializeMessage) };
      })
  );

  server.registerTool(
    'discord_pin_message',
    {
      description: 'Pin a message. Requires Manage Messages.',
      inputSchema: { channelId: snowflake, messageId: snowflake },
    },
    async ({ channelId, messageId }) =>
      safely(async () => {
        requireWrites();
        const channel = await resolveChannel(channelId);
        const message = await fetchMessage(channel, messageId);
        await (message as unknown as { pin(): Promise<unknown> }).pin();
        return { pinned: true, channelId, messageId };
      })
  );

  server.registerTool(
    'discord_unpin_message',
    {
      description: 'Unpin a message. Requires Manage Messages.',
      inputSchema: { channelId: snowflake, messageId: snowflake },
    },
    async ({ channelId, messageId }) =>
      safely(async () => {
        requireWrites();
        const channel = await resolveChannel(channelId);
        const message = await fetchMessage(channel, messageId);
        await (message as unknown as { unpin(): Promise<unknown> }).unpin();
        return { unpinned: true, channelId, messageId };
      })
  );

  server.registerTool(
    'discord_react',
    {
      description: 'React to a message with a unicode emoji or name:id custom emoji.',
      inputSchema: {
        channelId: snowflake,
        messageId: snowflake,
        emoji: z.string().min(1).max(128),
      },
    },
    async ({ channelId, messageId, emoji }) =>
      safely(async () => {
        requireWrites();
        const channel = await resolveChannel(channelId);
        const message = await fetchMessage(channel, messageId);
        await (message as unknown as { react(value: string): Promise<unknown> }).react(emoji);
        return { reacted: true, channelId, messageId, emoji };
      })
  );

  server.registerTool(
    'discord_remove_reaction',
    {
      description: 'Remove one of the account\'s reactions from a message.',
      inputSchema: {
        channelId: snowflake,
        messageId: snowflake,
        emoji: z.string().min(1).max(128),
      },
    },
    async ({ channelId, messageId, emoji }) =>
      safely(async () => {
        requireWrites();
        const me = (await getClient()).user;
        if (!me) throw new Error('Account user is not available yet.');
        const channel = await resolveChannel(channelId);
        const message = await fetchMessage(channel, messageId);
        const manager = (message as unknown as {
          reactions: {
            cache: Map<
              string,
              {
                emoji: { id: string | null; name: string | null; toString(): string };
                users: { remove(userId: string): Promise<unknown> };
              }
            >;
          };
        }).reactions;
        const reaction = [...manager.cache.values()].find((entry) => {
          const { id, name } = entry.emoji;
          return entry.emoji.toString() === emoji || entry.emoji.toString().slice(1, -1) === emoji || id === emoji || name === emoji;
        });
        if (!reaction) throw new Error(`No reaction "${emoji}" found on message ${messageId}.`);
        await reaction.users.remove(me.id);
        return { removed: true, channelId, messageId, emoji };
      })
  );

  server.registerTool(
    'discord_send_typing',
    {
      description: 'Show the typing indicator in a channel.',
      inputSchema: { channelId: snowflake },
    },
    async ({ channelId }) =>
      safely(async () => {
        const channel = await resolveChannel(channelId);
        if (!channel.sendTyping) throw new Error(`Channel ${channelId} does not support typing indicators.`);
        await channel.sendTyping();
        return { typing: true, channelId };
      })
  );

  server.registerTool(
    'discord_list_reactions',
    {
      description: 'List reactions on a message and the users who added them.',
      inputSchema: {
        channelId: snowflake,
        messageId: snowflake,
        limit: z.number().int().min(1).max(100).default(25),
      },
    },
    async ({ channelId, messageId, limit }) =>
      safely(async () => {
        const channel = await resolveChannel(channelId);
        const message = await fetchMessage(channel, messageId);
        const cache = (message as unknown as { reactions: { cache: Map<string, unknown> } }).reactions.cache;
        const reactions = await Promise.all(
          [...cache.entries()].map(async ([key, raw]) => {
            const reaction = raw as {
              emoji: { toString(): string };
              count: number;
              me: boolean;
              users: { fetch(options?: unknown): Promise<Map<string, unknown>> };
            };
            const users = await reaction.users.fetch({ limit });
            return {
              emoji: reaction.emoji.toString(),
              key,
              count: reaction.count,
              me: reaction.me,
              users: [...users.values()].map((user) => serializeUser(user as never)),
            };
          })
        );
        return { count: reactions.length, reactions };
      })
  );
}
