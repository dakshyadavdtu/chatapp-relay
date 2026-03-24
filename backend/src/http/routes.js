import { any, route } from './router.js';
import { handleAuthLogin } from './handlers/auth/login.js';
import { handleAuthLogout } from './handlers/auth/logout.js';
import { handleAuthRefresh } from './handlers/auth/refresh.js';
import { handleAuthRegister } from './handlers/auth/register.js';
import { handleHealth } from './handlers/health.js';
import { handleApiHealth } from './handlers/apiHealth.js';
import { handleApiMe } from './handlers/apiMe.js';

any('/', handleHealth);
any('/health', handleHealth);
route(['GET', 'HEAD'], '/api/health', handleApiHealth);
route(['GET', 'HEAD'], '/api/me', handleApiMe);
route(['POST'], '/api/login', handleAuthLogin);
route(['POST'], '/api/auth/login', handleAuthLogin);
route(['POST'], '/api/auth/refresh', handleAuthRefresh);
route(['POST'], '/api/logout', handleAuthLogout);
route(['POST'], '/api/register', handleAuthRegister);

export { match } from './router.js';

