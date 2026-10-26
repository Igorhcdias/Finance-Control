import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryNameSchema } from '../src/schemas/category.schema.ts';

test('category names reject empty and whitespace-only values', () => {
  assert.equal(categoryNameSchema.safeParse('').success, false);
  assert.equal(categoryNameSchema.safeParse('   ').success, false);
});

test('category names are trimmed and must contain at least two characters', () => {
  assert.equal(categoryNameSchema.parse('  Casa  '), 'Casa');
  assert.equal(categoryNameSchema.safeParse(' A ').success, false);
});

test('category names accept 50 characters and reject longer names', () => {
  assert.equal(categoryNameSchema.safeParse('a'.repeat(50)).success, true);
  assert.equal(categoryNameSchema.safeParse('a'.repeat(51)).success, false);
});
