import {
  Client,
  Events,
  type Channel,
  type Collection,
  type Guild,
  type GuildMember,
  type Message,
  type Role,
  type User,
} from '@discord-selfbot/core';
import { config } from './config.js';

export const DM_TYPES = new Set(['DM', 'GROUP_DM']);

export type AnyChannel = Channel & {
  name?: string | null;
  guildId?: string | null;
  topic?: string | null;
  messages?: MessageManagerLike;
  send?: (options: string | Record<string, unknown>) => Promise<Message>;
  sendTyping?: () => Promise<void>;
  createInvite?: (options?: Record<string, unknown>) => Promise<{ code: string }>;
  threads?: ThreadManagerLike;
  permissionOverwrites?: OverwriteManagerLike;
  setArchived?: (archived?: boolean, locked?: boolean, reason?: string) => Promise<unknown>;
  setLocked?: (locked?: boolean, reason?: string) => Promise<unknown>;
  join?: () => Promise<unknown>;
  leave?: () => Promise<unknown>;
};

export type MessageManagerLike = {
  fetch(options?: Record<string, unknown>): Promise<Collection<string, Message>>;
  search?(options?: Record<string, unknown>): Promise<{ messages: Collection<string, Message>; total: number }>;
  fetchPinned?(cache?: boolean): Promise<Collection<string, Message>>;
};

export type ThreadManagerLike = {
  create(options: Record<string, unknown>): Promise<AnyChannel>;
  fetchActive(): Promise<{ threads: Collection<string, AnyChannel> }>;
  fetchArchived(options?: Record<string, unknown>): Promise<{ threads: Collection<string, AnyChannel> }>;
};

export type OverwriteManagerLike = {
  edit(target: unknown, options: Record<string, boolean | null>, extra?: Record<string, unknown>): Promise<unknown>;
  delete(target: string | { id: string }, reason?: string): Promise<void>;
  cache: Collection<string, unknown>;
};

let ready: Promise<Client> | undefined;
let active: Client | undefined;

export function tokenPresent(): boolean {
  return Boolean(process.env.DISCORD_TOKEN?.trim());
}

export function requireWrites(): void {
  if (!config.allowWrites) {
    throw new Error('Write tools are disabled: DISCORD_MCP_ALLOW_WRITE is off. Set it to 1 to enable them.');
  }
}

export function requireAdmin(): void {
  requireWrites();
  if (!config.allowAdmin) {
    throw new Error('Admin tools are disabled: DISCORD_MCP_ALLOW_ADMIN is off. Set it to 1 to enable them.');
  }
}

function destroyClient(): void {
  try {
    active?.destroy();
  } catch {
    // Teardown errors do not matter once the process is exiting.
  }
  active = undefined;
  ready = undefined;
}

/** Logs in on first use. Never writes to stdout: stdout carries the MCP protocol. */
export function getClient(): Promise<Client> {
  if (ready) return ready;

  const token = process.env.DISCORD_TOKEN?.trim();
  if (!token) {
    return Promise.reject(new Error('DISCORD_TOKEN is not set. Add it to the MCP server "environment" block.'));
  }

  const client = new Client();
  active = client;

  ready = new Promise<Client>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Discord login did not finish within ${config.loginTimeoutMs}ms. The token may be invalid, rate limited or blocked.`
        )
      );
    }, config.loginTimeoutMs);

    client.once(Events.CLIENT_READY, () => {
      clearTimeout(timer);
      resolve(client);
    });

    client.login(token).catch((error: unknown) => {
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });

  ready.catch(() => destroyClient());

  return ready;
}

export function shutdown(): void {
  destroyClient();
}

export async function getAccount(): Promise<User> {
  const client = await getClient();
  return client.user as User;
}

export function assertGuildAllowed(guildId: string): void {
  if (config.guildAllowlist && !config.guildAllowlist.includes(guildId)) {
    throw new Error(`Guild ${guildId} is not in DISCORD_MCP_GUILDS. Allowed: ${config.guildAllowlist.join(', ')}`);
  }
}

export async function resolveGuild(guildId: string): Promise<Guild> {
  if (config.guildAllowlist && !config.guildAllowlist.includes(guildId)) {
    throw new Error(`Guild ${guildId} is not in DISCORD_MCP_GUILDS. Allowed: ${config.guildAllowlist.join(', ')}`);
  }
  const client = await getClient();
  return client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
}

export async function resolveChannel(channelId: string): Promise<AnyChannel> {
  const client = await getClient();
  const cached = client.channels.cache.get(channelId);
  const channel = (cached ?? (await client.channels.fetch(channelId))) as unknown as AnyChannel | null;
  if (!channel) throw new Error(`Channel ${channelId} not found or not visible to this account.`);
  if (channel.guildId) assertGuildAllowed(channel.guildId);
  return channel;
}

/**
 * Sending into a DM requires the channel to be cached, which means it already exists in the
 * account's DM list. Creating a DM with a stranger triggers Discord's captcha, so it is not exposed.
 */
export async function resolveMessageTarget(channelId: string): Promise<AnyChannel> {
  const client = await getClient();
  const cached = client.channels.cache.get(channelId);
  if (cached) {
    const channel = cached as unknown as AnyChannel;
    if (channel.guildId) assertGuildAllowed(channel.guildId);
    return channel;
  }

  const channel = await resolveChannel(channelId);
  if (DM_TYPES.has(String(channel.type))) {
    throw new Error(
      `DM channel ${channelId} is not in the account's channel cache. Opening a DM with a user who is not already in the DM list needs a captcha, so it is intentionally unsupported. Use discord_list_dms to find existing DM channels.`
    );
  }
  return channel;
}

export function hasMessages(channel: AnyChannel): boolean {
  return Boolean(channel.messages);
}

export async function fetchMessage(channel: AnyChannel, messageId: string): Promise<Message> {
  const manager = channel.messages as unknown as { fetch(id: string): Promise<Message> } | undefined;
  if (!manager) throw new Error(`Channel ${channel.id} does not support messages.`);
  return manager.fetch(messageId);
}

export async function resolveMember(guildId: string, userId: string): Promise<GuildMember> {
  const guild = await resolveGuild(guildId);
  const cached = guild.members.cache.get(userId);
  if (cached) return cached;
  return guild.members.fetch(userId);
}

export async function resolveRole(guildId: string, roleId: string): Promise<Role> {
  const guild = await resolveGuild(guildId);
  const cached = guild.roles.cache.get(roleId);
  if (cached) return cached;
  const fetched = await guild.roles.fetch(roleId);
  if (!fetched) throw new Error(`Role ${roleId} not found in guild ${guildId}.`);
  return fetched;
}
