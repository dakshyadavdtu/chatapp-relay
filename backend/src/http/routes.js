import { any, route } from './router.js';
import { handleHealth } from './handlers/health.js';
import { handleApiHealth } from './handlers/apiHealth.js';
import { handleApiMe } from './handlers/apiMe.js';

any('/', handleHealth);
any('/health', handleHealth);
route(['GET', 'HEAD'], '/api/health', handleApiHealth);
route(['GET', 'HEAD'], '/api/me', handleApiMe);

export { match } from './router.js';

