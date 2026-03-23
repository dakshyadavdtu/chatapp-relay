import { handleHealth } from './handlers/health.js';

export const routes = {
  '/': handleHealth,
  '/health': handleHealth,
};

