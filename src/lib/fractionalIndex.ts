const BASE62_ZERO = '0';

function getRequiredIntegerLength(head: string): number {
  if (head >= 'a' && head <= 'z') return head.charCodeAt(0) - 'a'.charCodeAt(0) + 2;
  if (head >= 'A' && head <= 'Z') return 'Z'.charCodeAt(0) - head.charCodeAt(0) + 2;
  return -1;
}

export function isValidFractionalIndex(key: unknown): key is string {
  if (typeof key !== 'string' || key.length === 0) return false;
  const requiredLen = getRequiredIntegerLength(key[0]);
  if (requiredLen < 0 || key.length < requiredLen) return false;
  const fractional = key.slice(requiredLen);
  if (fractional.endsWith(BASE62_ZERO)) return false;
  return true;
}
