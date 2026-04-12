export const WS_CLOSE_AUTH_CODES = Object.freeze([1008, 4001, 4003, 4005, 4401, 4403]);

export function isAuthCloseCode(code) {
  return Number.isFinite(code) && WS_CLOSE_AUTH_CODES.includes(code);
}
