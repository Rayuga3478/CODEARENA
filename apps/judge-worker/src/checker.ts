/**
 * Output Checker — Compares submission output against expected output.
 *
 * Supports multiple checker types:
 * - TOKEN: Splits by whitespace, compares tokens (most common for CP)
 * - EXACT: Byte-for-byte comparison (trimmed)
 * - FLOAT: Compares floating point numbers with epsilon tolerance
 */

/**
 * Check if the submission output matches the expected output.
 */
export function checkOutput(
  actual: string,
  expected: string,
  checkerType: string,
  epsilon: number = 1e-6,
): boolean {
  switch (checkerType) {
    case 'TOKEN':
      return tokenCheck(actual, expected);
    case 'EXACT':
      return exactCheck(actual, expected);
    case 'FLOAT':
      return floatCheck(actual, expected, epsilon);
    default:
      return tokenCheck(actual, expected);
  }
}

/**
 * Token-based checker: splits by whitespace, compares tokens.
 * Ignores leading/trailing whitespace and blank lines.
 * This is the standard CP checker.
 */
function tokenCheck(actual: string, expected: string): boolean {
  const actualTokens = actual.trim().split(/\s+/).filter(Boolean);
  const expectedTokens = expected.trim().split(/\s+/).filter(Boolean);

  if (actualTokens.length !== expectedTokens.length) return false;

  for (let i = 0; i < actualTokens.length; i++) {
    if (actualTokens[i] !== expectedTokens[i]) return false;
  }

  return true;
}

/**
 * Exact checker: trims both and compares character by character.
 */
function exactCheck(actual: string, expected: string): boolean {
  return actual.trim() === expected.trim();
}

/**
 * Float checker: parses both as space-separated floats,
 * compares with epsilon tolerance.
 */
function floatCheck(actual: string, expected: string, epsilon: number): boolean {
  const actualTokens = actual.trim().split(/\s+/).filter(Boolean);
  const expectedTokens = expected.trim().split(/\s+/).filter(Boolean);

  if (actualTokens.length !== expectedTokens.length) return false;

  for (let i = 0; i < actualTokens.length; i++) {
    const a = parseFloat(actualTokens[i]!);
    const e = parseFloat(expectedTokens[i]!);

    if (isNaN(a) || isNaN(e)) {
      // Fall back to exact comparison for non-numeric tokens
      if (actualTokens[i] !== expectedTokens[i]) return false;
    } else {
      if (Math.abs(a - e) > epsilon && Math.abs(a - e) / Math.max(1, Math.abs(e)) > epsilon) {
        return false;
      }
    }
  }

  return true;
}
