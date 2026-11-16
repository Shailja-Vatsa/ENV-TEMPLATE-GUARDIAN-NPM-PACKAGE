import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv, inferType, matchesType } from '../src/parser.js';

describe('parseEnv', () => {
  test('parses basic KEY=VALUE pairs', () => {
    const raw = `
      PORT=3000
      HOST=localhost
      DEBUG=true
    `;
    const map = parseEnv(raw);
    assert.equal(map.get('PORT')?.value, '3000');
    assert.equal(map.get('HOST')?.value, 'localhost');
    assert.equal(map.get('DEBUG')?.value, 'true');
  });

  test('handles double and single quotes', () => {
    const raw = `
      NAME="John Doe"
      GREETING='Hello World'
      ESCAPED="Line1\\nLine2"
    `;
    const map = parseEnv(raw);
    assert.equal(map.get('NAME')?.value, 'John Doe');
    assert.equal(map.get('GREETING')?.value, 'Hello World');
    assert.equal(map.get('ESCAPED')?.value, 'Line1\nLine2');
  });

  test('handles comments and inline comments', () => {
    const raw = `
      # Full line comment
      PORT=8080 # This is a port
      API_KEY=secret_key#notacomment
      DATABASE_URL=postgres://localhost/db # connection
    `;
    const map = parseEnv(raw);
    assert.equal(map.get('PORT')?.value, '8080');
    assert.equal(map.get('API_KEY')?.value, 'secret_key#notacomment');
    assert.equal(map.get('DATABASE_URL')?.value, 'postgres://localhost/db');
  });

  test('supports export prefix', () => {
    const raw = `
      export NODE_ENV=production
      export SECRET="my-jwt-secret"
    `;
    const map = parseEnv(raw);
    assert.equal(map.get('NODE_ENV')?.value, 'production');
    assert.equal(map.get('SECRET')?.value, 'my-jwt-secret');
  });

  test('parses multiline quoted values', () => {
    const raw = `
      CERT="-----BEGIN CERTIFICATE-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
-----END CERTIFICATE-----"
      NORMAL_KEY=value
    `;
    const map = parseEnv(raw);
    assert.ok(map.get('CERT')?.value.includes('BEGIN CERTIFICATE'));
    assert.ok(map.get('CERT')?.value.includes('END CERTIFICATE'));
    assert.equal(map.get('NORMAL_KEY')?.value, 'value');
  });
});

describe('inferType and matchesType', () => {
  test('infers and matches port', () => {
    assert.equal(inferType('3000'), 'port');
    assert.equal(inferType('8080'), 'port');
    assert.equal(matchesType('5000', 'port'), true);
    assert.equal(matchesType('99999', 'port'), false);
    assert.equal(matchesType('notaport', 'port'), false);
  });

  test('infers and matches boolean', () => {
    assert.equal(inferType('true'), 'boolean');
    assert.equal(inferType('false'), 'boolean');
    assert.equal(matchesType('true', 'boolean'), true);
    assert.equal(matchesType('false', 'boolean'), true);
    assert.equal(matchesType('1', 'boolean'), true);
    assert.equal(matchesType('0', 'boolean'), true);
    assert.equal(matchesType('maybe', 'boolean'), false);
  });

  test('infers and matches url', () => {
    assert.equal(inferType('http://localhost:3000'), 'url');
    assert.equal(inferType('https://api.example.com/v1'), 'url');
    assert.equal(inferType('postgres://user:pass@localhost:5432/db'), 'url');
    assert.equal(matchesType('https://test.com', 'url'), true);
    assert.equal(matchesType('not-a-url', 'url'), false);
  });

  test('infers and matches email', () => {
    assert.equal(inferType('dev@example.com'), 'email');
    assert.equal(matchesType('admin@site.org', 'email'), true);
    assert.equal(matchesType('invalid-email', 'email'), false);
  });

  test('infers and matches json', () => {
    assert.equal(inferType('{"key":"value"}'), 'json');
    assert.equal(inferType('["a", "b"]'), 'json');
    assert.equal(matchesType('{"a":1}', 'json'), true);
    assert.equal(matchesType('{invalid json}', 'json'), false);
  });
});
