import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  env: { ...process.env, DISCORD_TOKEN: 'fake.aaaa.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
  stderr: 'inherit',
});

const client = new Client({ name: 'smoke', version: '0.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`tools: ${tools.length}`);
for (const tool of tools) {
  assert.ok(tool.name.startsWith('discord_'), `unexpected tool name ${tool.name}`);
  console.log(`- ${tool.name}`);
}

const result = await client.callTool({ name: 'discord_list_members', arguments: { guildId: '123456789012345678' } });
assert.equal(result.isError, true, 'invalid token should produce a tool error, not a crash');
console.log('invalid token ->', result.content[0].text);

await client.close();
