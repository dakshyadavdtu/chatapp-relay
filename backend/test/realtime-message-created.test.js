import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  publishMessageCreated,
  subscribeMessageCreated,
} from '../src/realtime/messageCreated.js';

test('publishMessageCreated invokes subscriber', () => {
  let seen = null;
  subscribeMessageCreated((evt) => {
    seen = evt;
  });
  publishMessageCreated({ type: 'message.created', messageId: 'mid_1', chatId: 'c1' });
  assert.equal(seen?.messageId, 'mid_1');
  assert.equal(seen?.chatId, 'c1');
  subscribeMessageCreated(() => {});
});
