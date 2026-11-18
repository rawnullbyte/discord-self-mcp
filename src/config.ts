const truthy = new Set(['1', 'true', 'yes', 'on']);
const falsy = new Set(['0', 'false', 'no', 'off']);

function flag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (truthy.has(raw)) return true;
  if (falsy.has(raw)) return false;
  throw new Error(`${name} must be 1/0, true/false, yes/no or on/off (got "${raw}").`);
}

function idList(name: string): string[] | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const ids = raw.split(',').map((value) => value.trim()).filter(Boolean);
  if (ids.length === 0) return undefined;
  for (const id of ids) {
    if (!/^\d{5,25}$/.test(id)) throw new Error(`${name} contains an invalid Discord id: ${id}`);
  }
  return ids;
}

/** Read once at startup so a bad value fails fast instead of on the first tool call. */
export const config = {
  allowWrites: flag('DISCORD_MCP_ALLOW_WRITE', true),
  allowAdmin: flag('DISCORD_MCP_ALLOW_ADMIN', true),
  guildAllowlist: idList('DISCORD_MCP_GUILDS'),
  loginTimeoutMs: Number(process.env.DISCORD_MCP_LOGIN_TIMEOUT_MS ?? 60_000),
};

export function assertConfig(): void {
  if (!Number.isFinite(config.loginTimeoutMs) || config.loginTimeoutMs <= 0) {
    throw new Error('DISCORD_MCP_LOGIN_TIMEOUT_MS must be a positive number of milliseconds.');
  }
}
