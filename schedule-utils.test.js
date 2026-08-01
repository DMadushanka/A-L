import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScheduleDateTime } from './schedule-utils.js';

test('parses Colombo date/time strings for scheduled quizzes', () => {
  const d = parseScheduleDateTime('2026-08-01 20:30');
  assert.ok(d instanceof Date);
  assert.equal(d.toISOString(), '2026-08-01T15:00:00.000Z');
});

test('rejects invalid schedule values', () => {
  assert.equal(parseScheduleDateTime('not-a-date'), null);
});
