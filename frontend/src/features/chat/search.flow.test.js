import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chatState,
  clearSearchState,
  resetChatApi,
  resetChatState,
  searchChatDiscovery,
  setChatApi,
  setSearchQuery,
} from './state.js';

test('searchChatDiscovery stores normalized results', async () => {
  resetChatState();
  setChatApi({
    async searchChats() {
      return {
        success: true,
        data: {
          results: [
            {
              id: 'chat:direct:u1:u2',
              type: 'chat',
              chatId: 'direct:u1:u2',
              title: 'Test chat',
              participants: ['u2'],
              unreadCount: 1,
              preview: 'latest',
              updatedAt: 10,
            },
            {
              id: 'message:m1',
              type: 'message',
              chatId: 'direct:u1:u2',
              messageId: 'm1',
              preview: 'hello from search',
              createdAt: 15,
            },
          ],
        },
      };
    },
  });

  const out = await searchChatDiscovery('hello');
  assert.equal(out.ok, true);
  assert.equal(chatState.searchStatus, 'ok');
  assert.equal(chatState.searchResults.length, 2);
  assert.equal(chatState.searchResults[0].chatId, 'direct:u1:u2');
  assert.equal(chatState.searchResults[1].messageId, 'm1');
});

test('searchChatDiscovery sets error for bad response', async () => {
  resetChatState();
  setChatApi({
    async searchChats() {
      return { success: true, data: { results: null } };
    },
  });

  const out = await searchChatDiscovery('bad');
  assert.equal(out.ok, false);
  assert.equal(out.code, 'bad_response');
  assert.equal(chatState.searchStatus, 'error');
});

test('setSearchQuery and clearSearchState reset local search values', () => {
  resetChatState();
  chatState.searchStatus = 'ok';
  chatState.searchResults = [{ id: 'x', type: 'chat', chatId: 'c1' }];
  setSearchQuery('');
  assert.equal(chatState.searchStatus, 'idle');
  assert.deepEqual(chatState.searchResults, []);

  chatState.searchQuery = 'hello';
  chatState.searchStatus = 'error';
  chatState.searchError = 'search_failed';
  clearSearchState();
  assert.equal(chatState.searchQuery, '');
  assert.equal(chatState.searchStatus, 'idle');
  assert.equal(chatState.searchError, null);
});

test.after(() => {
  resetChatApi();
  resetChatState();
});
