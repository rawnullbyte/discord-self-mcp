import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveGuild, resolveRole, requireAdmin } from '../discord.js';
import { serializeRole } from '../format.js';
import { color, colorValue, permissionList, snowflake, safely } from '../util.js';

export function registerRoleTools(server: McpServer): void {
  server.registerTool(
    'discord_list_roles',
    {
      description: 'List roles of a server with permissions and position.',
      inputSchema: { guildId: snowflake },
    },
    async ({ guildId }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        const roles = guild.roles.cache.map((role) => serializeRole(role));
        return { count: roles.length, roles };
      })
  );

  server.registerTool(
    'discord_create_role',
    {
      description: 'Create a role. Requires Manage Roles.',
      inputSchema: {
        guildId: snowflake,
        name: z.string().min(1).max(100),
        color: color.optional(),
        hoist: z.boolean().default(false).describe('Show members with this role separately in the member list'),
        mentionable: z.boolean().default(false),
        permissions: z.array(z.string()).default([]).describe('Permission names, for example SendMessages'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, name, color: roleColor, hoist, mentionable, permissions, reason }) =>
      safely(async () => {
        requireAdmin();
        const guild = await resolveGuild(guildId);
        const role = await guild.roles.create({
          name,
          hoist,
          mentionable,
          ...(roleColor === undefined ? {} : { color: colorValue(roleColor) }),
          permissions: permissionList(permissions),
          reason,
        } as never);
        return serializeRole(role);
      })
  );

  server.registerTool(
    'discord_edit_role',
    {
      description: 'Rename a role, change its color, hoist, mentionable flag or permissions. Requires Manage Roles.',
      inputSchema: {
        guildId: snowflake,
        roleId: snowflake,
        name: z.string().min(1).max(100).optional(),
        color: color.optional(),
        hoist: z.boolean().optional(),
        mentionable: z.boolean().optional(),
        permissions: z.array(z.string()).optional().describe('Replaces the permission set when provided'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, roleId, name, color: roleColor, hoist, mentionable, permissions, reason }) =>
      safely(async () => {
        requireAdmin();
        const role = await resolveRole(guildId, roleId);
        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (roleColor !== undefined) data.color = colorValue(roleColor);
        if (hoist !== undefined) data.hoist = hoist;
        if (mentionable !== undefined) data.mentionable = mentionable;
        if (permissions !== undefined) data.permissions = permissionList(permissions);
        if (Object.keys(data).length === 0) throw new Error('Provide at least one field to change.');
        const updated = await role.edit(data as never, reason);
        return serializeRole(updated);
      })
  );

  server.registerTool(
    'discord_delete_role',
    {
      description: 'Delete a role. Requires confirm: true and Manage Roles.',
      inputSchema: {
        guildId: snowflake,
        roleId: snowflake,
        confirm: z.literal(true).describe('Must be true. Deletion cannot be undone.'),
        reason: z.string().max(512).optional(),
      },
    },
    async ({ guildId, roleId, reason }) =>
      safely(async () => {
        requireAdmin();
        const role = await resolveRole(guildId, roleId);
        const name = role.name;
        await role.delete(reason);
        return { deleted: true, guildId, roleId, name };
      })
  );

  server.registerTool(
    'discord_set_role_position',
    {
      description: 'Move a role to a position. Requires Manage Roles.',
      inputSchema: {
        guildId: snowflake,
        roleId: snowflake,
        position: z.number().int().min(0).max(1000),
      },
    },
    async ({ guildId, roleId, position }) =>
      safely(async () => {
        requireAdmin();
        const role = await resolveRole(guildId, roleId);
        const updated = await role.setPosition(position);
        return serializeRole(updated);
      })
  );

  server.registerTool(
    'discord_list_role_members',
    {
      description: 'List member ids that have a role.',
      inputSchema: { guildId: snowflake, roleId: snowflake },
    },
    async ({ guildId, roleId }) =>
      safely(async () => {
        const guild = await resolveGuild(guildId);
        await resolveRole(guildId, roleId);
        const ids = await guild.roles.fetchMemberIds(roleId);
        return { roleId, count: ids.length, memberIds: ids };
      })
  );
}
