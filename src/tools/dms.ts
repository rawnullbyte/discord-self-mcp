import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DM_TYPES, getClient } from '../discord.js';
import { serializeChannel } from '../format.js';
import { safely } from '../util.js';

export function registerDmTools(server: McpServer): void {
  server.registerTool(
    'discord_list_dms',
    {
      description: 'List existing DM and group DM channels. Only these channels can be messaged by the account.',
      inputSchema: {
        limit: z.number().int().min(1).max(200).default(50),
        query: z.string().optional().describe('Match recipient username or channel name'),
      },
    },
    async ({ limit, query }) =>
      safely(async () => {
        const client = await getClient();
        const needle = query?.toLowerCase();
        const channels = client.channels.cache
          .filter((channel) => DM_TYPES.has(String(channel.type)))
          .map((channel) => channel as unknown as Parameters<typeof serializeChannel>[0])
          .filter((channel) => {
            if (!needle) return true;
            const name = `${channel.name ?? ''} ${channel.recipient?.username ?? ''}`.toLowerCase();
            return name.includes(needle);
          })
          .slice(0, limit)
          .map((channel) => serializeChannel(channel));
        return {
          count: channels.length,
          dms: channels,
          note: 'Creating a DM with a new user needs a captcha and is not exposed.',
        };
      })
  );
}
