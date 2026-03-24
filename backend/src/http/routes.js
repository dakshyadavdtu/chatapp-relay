import { handleHealth } from './handlers/health.js';
import { handleApiHealth } from './handlers/apiHealth.js';
import { handleApiMe } from './handlers/apiMe.js';

export const routes = {
  '/': handleHealth,
  '/health': handleHealth,
  '/api/health': handleApiHealth,
  '/api/me': handleApiMe,
};

