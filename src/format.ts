import type {
  Channel,
  Collection,
  Guild,
  GuildAuditLogs,
  GuildAuditLogsEntry,
  GuildMember,
  Invite,
  Message,
  Role,
  User,
} from '@discord-selfbot/core';

type GuildChannelLike = Channel & {
  name?: string | null;
  guildId?: string | null;
  topic?: string | null;
  nsfw?: boolean;
  parentId?: string | null;
  position?: number;
  rateLimitPerUser?: number;
  recipient?: User;
};

type UserLike = User & { globalName?: string | null; tag?: string };

export function iso(value: Date | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function serializeUser(user: UserLike | null | undefined) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    globalName: user.globalName ?? null,
    displayName: user.displayName ?? null,
    bot: user.bot ?? false,
    createdAt: iso(user.createdAt),
  };
}

export function serializeMember(member: GuildMember) {
  return {
    id: member.id,
    user: serializeUser(member.user as UserLike),
    nickname: member.nickname ?? null,
    joinedAt: iso(member.joinedAt),
    communicationDisabledUntil: iso(member.communicationDisabledUntil),
    roles: member.roles.cache.map((role) => ({ id: role.id, name: role.name, color: role.hexColor })),
    permissions: member.permissions.toArray(),
  };
}

export function serializeChannel(channel: GuildChannelLike) {
  return {
    id: channel.id,
    type: String(channel.type),
    name: channel.name ?? null,
    guildId: channel.guildId ?? null,
    topic: channel.topic ?? null,
    parentId: channel.parentId ?? null,
    position: channel.position ?? null,
    nsfw: channel.nsfw ?? false,
    slowmode: channel.rateLimitPerUser ?? null,
    recipient: serializeUser(channel.recipient ?? null),
  };
}

export function serializeGuild(guild: Guild) {
  return {
    id: guild.id,
    name: guild.name,
    ownerId: guild.ownerId,
    memberCount: guild.memberCount,
    description: guild.description ?? null,
    createdAt: iso(guild.createdAt),
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size,
    emojis: guild.emojis.cache.size,
    preferredLocale: guild.preferredLocale,
  };
}

export function serializeRole(role: Role) {
  return {
    id: role.id,
    name: role.name,
    color: role.hexColor,
    position: role.position,
    hoist: role.hoist,
    mentionable: role.mentionable,
    managed: role.managed,
    permissions: role.permissions.toArray(),
  };
}

export function serializeOverwrite(overwrite: {
  id: string;
  type: string | number;
  allow: { toArray(): string[] };
  deny: { toArray(): string[] };
}) {
  return {
    id: overwrite.id,
    type: String(overwrite.type),
    allow: overwrite.allow.toArray(),
    deny: overwrite.deny.toArray(),
  };
}

export function serializeMessage(message: Message) {
  const reference = message.reference as { messageId?: string | null; channelId?: string | null } | null | undefined;
  return {
    id: message.id,
    channelId: message.channelId,
    guildId: message.guildId ?? null,
    author: serializeUser(message.author as UserLike),
    content: message.content,
    createdAt: iso(message.createdAt),
    editedAt: iso(message.editedAt),
    pinned: message.pinned ?? false,
    tts: message.tts,
    type: String(message.type),
    replyTo: reference?.messageId ?? null,
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      url: attachment.url,
      size: attachment.size,
      contentType: attachment.contentType,
    })),
    embeds: message.embeds.map((embed) => ({
      title: embed.title ?? null,
      description: embed.description ?? null,
      url: embed.url ?? null,
    })),
    reactions: message.reactions.cache.map((reaction) => ({
      emoji: reaction.emoji.toString(),
      count: reaction.count,
      me: reaction.me,
    })),
  };
}

export function serializeInvite(invite: Invite) {
  const inviter = invite.inviter as UserLike | null | undefined;
  return {
    code: invite.code,
    url: invite.url,
    channelId: invite.channelId ?? invite.channel?.id ?? null,
    guildId: invite.guild?.id ?? null,
    inviter: serializeUser(inviter ?? null),
    uses: invite.uses,
    maxUses: invite.maxUses,
    maxAge: invite.maxAge,
    temporary: invite.temporary,
    expiresAt: iso(invite.expiresAt),
    createdAt: iso(invite.createdAt),
  };
}

export function serializeThread(thread: {
  id: string;
  name: string;
  parentId?: string | null;
  ownerId?: string | null;
  archived?: boolean;
  locked?: boolean;
  memberCount?: number;
  messageCount?: number;
  createdAt?: Date;
  archivedAt?: Date | null;
  autoArchiveDuration?: number;
}) {
  return {
    id: thread.id,
    name: thread.name,
    parentId: thread.parentId ?? null,
    ownerId: thread.ownerId ?? null,
    archived: thread.archived ?? false,
    locked: thread.locked ?? false,
    memberCount: thread.memberCount ?? null,
    messageCount: thread.messageCount ?? null,
    createdAt: iso(thread.createdAt),
    archivedAt: iso(thread.archivedAt),
    autoArchiveDuration: thread.autoArchiveDuration ?? null,
  };
}

export function serializeAuditEntry(entry: GuildAuditLogsEntry) {
  const executor = entry.executor as UserLike | null | undefined;
  return {
    id: entry.id,
    action: String(entry.action),
    actionType: String(entry.actionType),
    targetId: entry.targetId,
    executor: serializeUser(executor ?? null),
    reason: entry.reason,
    createdAt: iso(entry.createdAt),
    changes: entry.changes.map((change) => ({
      key: change.key,
      old: change.old,
      new: change.new,
    })),
  };
}

export function auditActions(logs: GuildAuditLogs): string[] {
  return Object.keys(logs);
}

export function serializeBan(ban: { user: UserLike; reason?: string | null }) {
  return { user: serializeUser(ban.user), reason: ban.reason ?? null };
}

export function mapCollection<T, R>(collection: Collection<string, T>, fn: (value: T) => R): R[] {
  return [...collection.values()].map(fn);
}
