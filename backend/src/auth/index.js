import { getCookie } from './cookies.js';
import { getSession } from './session.js';
import {
  loginWithPassword,
  logoutWithRequest,
  refreshWithRequest,
  registerWithBody,
} from './service.js';

export { getCookie, getSession, loginWithPassword, logoutWithRequest, refreshWithRequest, registerWithBody };

export function createAuth() {
  return {
    getCookie,
    getSession,
    loginWithPassword,
    logoutWithRequest,
    refreshWithRequest,
    registerWithBody,
  };
}
