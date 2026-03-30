import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emitMessageCreated,
  onMessageCreated,
} from '../src/realtime/bus.js';

test('emitMessageCreated invokes subscriber', () => {
  let seen = null;
  onMessageCreated((evt) => {
    seen = evt;
  });
  emitMessageCreated({ type: 'MESSAGE_RECEIVE', messageId: 'mid_1', chatId: 'c1' });
  assert.equal(seen?.messageId, 'mid_1');
  assert.equal(seen?.chatId, 'c1');
});
