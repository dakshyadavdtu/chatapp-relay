import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chatState,
  resetChatApi,
  resetChatState,
  setActiveChatId,
  setChatApi,
  uploadImageForActiveChat,
} from './state.js';

test('uploadImageForActiveChat rejects unsupported file type', async () => {
  resetChatState();
  setActiveChatId('chat-1');

  const out = await uploadImageForActiveChat({
    name: 'notes.txt',
    type: 'text/plain',
    size: 100,
  });

  assert.equal(out.ok, false);
  assert.equal(out.code, 'UNSUPPORTED_FILE_TYPE');
  assert.equal(chatState.uploadStatus, 'error');
});

test('uploadImageForActiveChat handles upload failure', async () => {
  resetChatState();
  setActiveChatId('chat-1');
  setChatApi({
    async uploadChatImage() {
      throw { code: 'UPLOAD_FAILED' };
    },
  });

  const out = await uploadImageForActiveChat({
    name: 'photo.png',
    type: 'image/png',
    size: 1000,
  });

  assert.equal(out.ok, false);
  assert.equal(out.code, 'UPLOAD_FAILED');
  assert.equal(chatState.uploadStatus, 'error');
});

test('uploadImageForActiveChat stores success state', async () => {
  resetChatState();
  setActiveChatId('chat-1');
  setChatApi({
    async uploadChatImage() {
      return {
        success: true,
        data: {
          upload: {
            url: '/uploads/img_123',
            mimeType: 'image/png',
            filename: 'photo.png',
            size: 1024,
          },
        },
      };
    },
  });

  const out = await uploadImageForActiveChat({
    name: 'photo.png',
    type: 'image/png',
    size: 1024,
  });

  assert.equal(out.ok, true);
  assert.equal(out.data.url, '/uploads/img_123');
  assert.equal(chatState.uploadStatus, 'ok');
});

test.after(() => {
  resetChatApi();
  resetChatState();
});
