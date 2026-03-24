export function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function jsonOk(res, data, status = 200) {
  writeJson(res, status, { success: true, data });
}

export function jsonErr(res, status, message, code = 'ERROR') {
  writeJson(res, status, { success: false, error: message, code });
}
