import { Permissions } from '@discord-selfbot/core';
import { z } from 'zod';

export type TextResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export function json(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, inner) => {
      if (inner instanceof Map) return Object.fromEntries(inner);
      return inner;
    },
    2
  );
}

export function ok(value: unknown): TextResult {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : json(value) }] };
}

export function fail(error: unknown): TextResult {
  const message = error instanceof Error ? error.message : String(error);
  const extra = (error as { code?: unknown; status?: number } | null) ?? {};
  const details: string[] = [];
  if (typeof error === 'object' && error !== null && 'code' in error) details.push(`code ${String(extra.code)}`);
  if (typeof extra.status === 'number') details.push(`status ${extra.status}`);
  const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';
  return { content: [{ type: 'text', text: `Error: ${message}${suffix}` }], isError: true };
}

/** Wraps a handler so every failure becomes an MCP tool error instead of a crashed server. */
export async function safely(fn: () => Promise<unknown>): Promise<TextResult> {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(error);
  }
}

export const snowflake = z
  .string()
  .regex(/^\d{5,25}$/, 'must be a numeric Discord id (snowflake)')
  .describe('Discord id (snowflake)');

export const color = z
  .union([z.number().int().min(0).max(0xffffff), z.string().regex(/^#?[0-9a-fA-F]{6}$/)])
  .describe('Color as 0xRRGGBB integer or hex string');

export function colorValue(input: number | string): number {
  if (typeof input === 'number') return input;
  return Number.parseInt(input.replace(/^#/, ''), 16);
}

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();
}

/** Accepts camelCase (SendMessages) and raw flag names (SEND_MESSAGES). */
export function normalizePermission(name: string): string {
  if (name in Permissions.FLAGS) return name;
  const snake = toSnakeCase(name);
  if (snake in Permissions.FLAGS) return snake;
  throw new Error(
    `Unknown permission "${name}". Use names like ViewChannel, SendMessages, ManageRoles, ReadMessageHistory.`
  );
}

/**
 * Validates permission names against the library's flag table, then returns an overwrite map.
 * Unknown names throw, so a typo cannot silently grant nothing.
 */
export function permissionOverwrites(allow: string[] = [], deny: string[] = []): Record<string, boolean> {
  if (allow.length === 0 && deny.length === 0) {
    throw new Error('Provide at least one permission in allow or deny.');
  }
  const overwrites: Record<string, boolean> = {};
  for (const name of allow) overwrites[normalizePermission(name)] = true;
  for (const name of deny) overwrites[normalizePermission(name)] = false;
  return overwrites;
}

export function permissionList(names: string[]): string[] {
  return names.map(normalizePermission);
}

export function permissionNames(value: unknown): string[] {
  const permissions = value as { toArray(): string[] } | null | undefined;
  return permissions?.toArray?.() ?? [];
}
