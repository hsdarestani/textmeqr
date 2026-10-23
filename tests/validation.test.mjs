import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, validateLabel, validateNote, allowedReasons, randomSlug } from '../worker/index.js';

test('email rejects malformed and accepts normal addresses', () => {
  assert.equal(validateEmail('  Ada@Example.de '), 'ada@example.de');
  assert.equal(validateEmail('invalid'), null);
  assert.equal(validateEmail('test@example..com'), null);
  assert.equal(validateEmail(''), null);
});
test('labels are bounded and cannot be empty', () => {
  assert.equal(validateLabel(' Mein Auto '), 'Mein Auto');
  assert.equal(validateLabel('   '), null);
  assert.equal(validateLabel('a'.repeat(41)), null);
});
test('messages and reasons are bounded', () => {
  assert.equal(validateNote('h'.repeat(321)), null);
  assert.equal(validateNote('Fenster offen'), 'Fenster offen');
  assert.equal(allowedReasons.has('lights'), true);
  assert.equal(allowedReasons.has('other-abuse'), false);
});
test('generated QR identifiers are opaque', () => {
  const values = new Set(Array.from({ length: 250 }, randomSlug));
  assert.equal(values.size, 250);
  for (const value of values) assert.match(value, /^[A-Za-z0-9_-]{22}$/);
});
