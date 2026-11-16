import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv } from '../src/parser.js';
import { validateEnv } from '../src/validator.js';

describe('validateEnv', () => {
  test('passes when all keys match and values are valid', () => {
    const example = parseEnv(`
      PORT=3000
      DATABASE_URL=postgres://localhost:5432/app
      DEBUG=true
    `);
    const actual = parseEnv(`
      PORT=8080
      DATABASE_URL=postgres://remote:5432/proddb
      DEBUG=false
    `);

    const result = validateEnv(example, actual);
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });

  test('flags missing keys as fatal errors', () => {
    const example = parseEnv(`
      PORT=3000
      SECRET_KEY=placeholder
      DATABASE_URL=postgres://localhost/db
    `);
    const actual = parseEnv(`
      PORT=3000
    `);

    const result = validateEnv(example, actual);
    assert.equal(result.valid, false);
    assert.equal(result.missingCount, 2);
    const missingKeys = result.issues.filter((i) => i.type === 'MISSING_KEY').map((i) => i.key);
    assert.deepEqual(missingKeys, ['SECRET_KEY', 'DATABASE_URL']);
  });

  test('flags empty values when example provides non-empty placeholder', () => {
    const example = parseEnv(`
      PORT=3000
      API_KEY=your_key_here
    `);
    const actual = parseEnv(`
      PORT=3000
      API_KEY=
    `);

    const result = validateEnv(example, actual);
    assert.equal(result.valid, false);
    assert.equal(result.emptyCount, 1);
    assert.equal(result.issues[0].key, 'API_KEY');
    assert.equal(result.issues[0].type, 'EMPTY_VALUE');
  });

  test('detects type mismatches (warning by default, error in strict mode)', () => {
    const example = parseEnv(`
      PORT=3000
      DATABASE_URL=postgres://localhost:5432/db
      ENABLE_LOGS=true
    `);
    const actual = parseEnv(`
      PORT=invalid_port
      DATABASE_URL=not-a-valid-url
      ENABLE_LOGS=maybe
    `);

    // Non-strict: issues flagged with severity 'warning'
    const nonStrict = validateEnv(example, actual, { strict: false });
    assert.equal(nonStrict.valid, true); // Still valid if only warnings
    assert.equal(nonStrict.mismatchCount, 3);
    assert.equal(nonStrict.issues[0].severity, 'warning');

    // Strict mode: issues flagged with severity 'error'
    const strictResult = validateEnv(example, actual, { strict: true });
    assert.equal(strictResult.valid, false);
    assert.equal(strictResult.issues[0].severity, 'error');
  });

  test('detects extra / unused keys', () => {
    const example = parseEnv(`
      PORT=3000
    `);
    const actual = parseEnv(`
      PORT=3000
      OLD_DEPRECATED_KEY=true
      UNUSED_KEY=hello
    `);

    // Standard mode: extra keys recorded in count
    const normal = validateEnv(example, actual);
    assert.equal(normal.valid, true);
    assert.equal(normal.extraCount, 2);

    // Strict mode: extra keys become issues
    const strictResult = validateEnv(example, actual, { strict: true });
    assert.equal(strictResult.valid, false);
    const extraIssues = strictResult.issues.filter((i) => i.type === 'EXTRA_KEY');
    assert.equal(extraIssues.length, 2);
  });
});
