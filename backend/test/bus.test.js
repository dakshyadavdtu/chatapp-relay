import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emitMessageCreated, onMessageCreated } from '../src/realtime/bus.js';

test('bus supports multiple listeners', () => {
  const seen = [];
  onMessageCreated((evt) => seen.push(`a:${evt.messageId}`));
  onMessageCreated((evt) => seen.push(`b:${evt.messageId}`));
  emitMessageCreated({ messageId: 'm1' });
  assert.ok(seen.includes('a:m1'));
  assert.ok(seen.includes('b:m1'));
});

test('bus swallows listener errors', () => {
  onMessageCreated(() => { throw new Error('boom'); });
  assert.doesNotThrow(() => {
    emitMessageCreated({ messageId: 'm2' });
  });
});
