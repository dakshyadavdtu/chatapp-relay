export function assertDefined(value, label = 'value') {
  if (value === undefined || value === null) {
    throw new Error(`${label} is required`);
  }
  return value;
}
