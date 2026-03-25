import { createMemoryStorage } from './memory.js';

let shared;

export function createStorage() {
  return createMemoryStorage();
}

export function getStorage() {
  if (!shared) {
    shared = createMemoryStorage();
  }
  return shared;
}
