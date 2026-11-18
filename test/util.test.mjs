import assert from 'node:assert/strict';
import { test } from 'node:test';
import { colorValue, normalizePermission, permissionList, permissionOverwrites, snowflake } from '../dist/util.js';

test('snowflake accepts Discord ids and rejects junk', () => {
  assert.equal(snowflake.safeParse('123456789012345678').success, true);
  assert.equal(snowflake.safeParse('abc').success, false);
  assert.equal(snowflake.safeParse('123').success, false);
});

test('permission names normalize to library flags', () => {
  assert.equal(normalizePermission('ViewChannel'), 'VIEW_CHANNEL');
  assert.equal(normalizePermission('VIEW_CHANNEL'), 'VIEW_CHANNEL');
  assert.deepEqual(permissionList(['SendMessages']), ['SEND_MESSAGES']);
});

test('permission overwrites map names to booleans', () => {
  assert.deepEqual(permissionOverwrites(['ViewChannel'], ['SendMessages']), {
    VIEW_CHANNEL: true,
    SEND_MESSAGES: false,
  });
});

test('unknown permission names are rejected', () => {
  assert.throws(() => permissionOverwrites(['NotARealPermission']), /Unknown permission/);
  assert.throws(() => permissionList(['nope']), /Unknown permission/);
});

test('empty overwrite is an error', () => {
  assert.throws(() => permissionOverwrites([], []));
});

test('colors accept integers and hex strings', () => {
  assert.equal(colorValue(0xff0000), 0xff0000);
  assert.equal(colorValue('#00ff00'), 0x00ff00);
});
