#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { assertConfig, config } from './config.js';
import { shutdown, tokenPresent } from './discord.js';
import { registerAccountTools } from './tools/account.js';
import { registerChannelTools } from './tools/channels.js';
import { registerDmTools } from './tools/dms.js';
import { registerEmojiTools } from './tools/emojis.js';
import { registerGuildTools } from './tools/guilds.js';
import { registerInviteTools } from './tools/invites.js';
import { registerMemberTools } from './tools/members.js';
import { registerMessageTools } from './tools/messages.js';
import { registerRoleTools } from './tools/roles.js';
import { registerThreadTools } from './tools/threads.js';
import { registerUserTools } from './tools/users.js';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  assertConfig();

  if (!tokenPresent()) {
    console.error('discord-self-mcp: DISCORD_TOKEN is not set. Add it to the MCP server "environment" block.');
    process.exit(1);
  }

  const server = new McpServer({ name: 'discord-self-mcp', version: VERSION });

  registerAccountTools(server);
  registerGuildTools(server);
  registerChannelTools(server);
  registerMessageTools(server);
  registerMemberTools(server);
  registerRoleTools(server);
  registerInviteTools(server);
  registerThreadTools(server);
  registerEmojiTools(server);
  registerDmTools(server);
  registerUserTools(server);

  await server.connect(new StdioServerTransport());

  const stop = (): void => {
    shutdown();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  process.stdin.on('close', stop);

  console.error(
    `discord-self-mcp ${VERSION} ready (writes=${config.allowWrites ? 'on' : 'off'}, admin=${
      config.allowAdmin ? 'on' : 'off'
    }${config.guildAllowlist ? `, guilds=${config.guildAllowlist.join(',')}` : ''})`
  );
}

main().catch((error: unknown) => {
  console.error(`discord-self-mcp failed to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
