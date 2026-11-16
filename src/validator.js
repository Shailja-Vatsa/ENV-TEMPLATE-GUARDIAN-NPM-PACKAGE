import { inferType, matchesType } from './parser.js';

/**
 * Validates an actual .env map against an .env.example template map.
 *
 * @param {Map<string, { key: string, value: string, raw: string, line: number }>} exampleMap
 * @param {Map<string, { key: string, value: string, raw: string, line: number }>} actualMap
 * @param {object} [options]
 * @param {boolean} [options.strict=false] - If true, warnings (e.g. type mismatches, extra keys) become blocking errors.
 * @param {boolean} [options.allowExtra=true] - If false, extra keys in .env produce issues.
 * @returns {{
 *   valid: boolean,
 *   issues: Array<{
 *     key: string,
 *     type: 'MISSING_KEY' | 'EMPTY_VALUE' | 'TYPE_MISMATCH' | 'EXTRA_KEY',
 *     severity: 'error' | 'warning',
 *     message: string,
 *     exampleValue?: string,
 *     actualValue?: string,
 *     expectedType?: string,
 *     actualType?: string,
 *     line?: number
 *   }>,
 *   missingCount: number,
 *   emptyCount: number,
 *   mismatchCount: number,
 *   extraCount: number,
 *   exampleTotal: number,
 *   actualTotal: number
 * }}
 */
export function validateEnv(exampleMap, actualMap, options = {}) {
  const { strict = false, allowExtra = true } = options;
  const issues = [];

  let missingCount = 0;
  let emptyCount = 0;
  let mismatchCount = 0;
  let extraCount = 0;

  // 1. Check for missing keys, empty values, and type mismatches
  for (const [key, exampleEntry] of exampleMap.entries()) {
    const actualEntry = actualMap.get(key);

    if (!actualEntry) {
      missingCount++;
      issues.push({
        key,
        type: 'MISSING_KEY',
        severity: 'error',
        message: `Missing required key: "${key}"`,
        exampleValue: exampleEntry.value,
        expectedType: inferType(exampleEntry.value),
        line: exampleEntry.line
      });
      continue;
    }

    const exampleVal = exampleEntry.value.trim();
    const actualVal = actualEntry.value.trim();

    // Empty value check: example has placeholder value, actual is blank
    if (exampleVal !== '' && actualVal === '') {
      emptyCount++;
      issues.push({
        key,
        type: 'EMPTY_VALUE',
        severity: 'error',
        message: `Key "${key}" is empty, but template specifies "${exampleEntry.value}"`,
        exampleValue: exampleEntry.value,
        actualValue: actualEntry.value,
        line: actualEntry.line
      });
      continue;
    }

    // Type inference check
    if (exampleVal !== '' && actualVal !== '') {
      const inferred = inferType(exampleVal);
      if (inferred !== 'string') {
        const matches = matchesType(actualVal, inferred);
        if (!matches) {
          mismatchCount++;
          const actualInferred = inferType(actualVal);
          issues.push({
            key,
            type: 'TYPE_MISMATCH',
            severity: strict ? 'error' : 'warning',
            message: `Key "${key}" expected format "${inferred}" (example: "${exampleVal}"), but received "${actualVal}"`,
            exampleValue: exampleEntry.value,
            actualValue: actualEntry.value,
            expectedType: inferred,
            actualType: actualInferred,
            line: actualEntry.line
          });
        }
      }
    }
  }

  // 2. Check for extra keys in .env not defined in .env.example
  for (const [key, actualEntry] of actualMap.entries()) {
    if (!exampleMap.has(key)) {
      extraCount++;
      if (strict || !allowExtra) {
        issues.push({
          key,
          type: 'EXTRA_KEY',
          severity: strict ? 'error' : 'warning',
          message: `Unused/extra key "${key}" found in .env (not in .env.example)`,
          actualValue: actualEntry.value,
          line: actualEntry.line
        });
      }
    }
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return {
    valid: !hasErrors,
    issues,
    missingCount,
    emptyCount,
    mismatchCount,
    extraCount,
    exampleTotal: exampleMap.size,
    actualTotal: actualMap.size
  };
}
