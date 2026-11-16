import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCLI, parseArgs } from '../src/cli.js';

describe('CLI arguments & execution', () => {
  test('parseArgs parses flags properly', () => {
    const opts = parseArgs([
      '-e',
      '.env.custom',
      '-x',
      '.env.custom.example',
      '--strict',
      '--fix',
      '--quiet'
    ]);
    assert.equal(opts.envPath, '.env.custom');
    assert.equal(opts.examplePath, '.env.custom.example');
    assert.equal(opts.strict, true);
    assert.equal(opts.fix, true);
    assert.equal(opts.quiet, true);
  });

  test('runCLI returns exit code 0 when .env is valid', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-guard-test-'));
    const exampleFile = path.join(tempDir, '.env.example');
    const envFile = path.join(tempDir, '.env');

    fs.writeFileSync(exampleFile, 'PORT=3000\nAPP_NAME=MyApp\n');
    fs.writeFileSync(envFile, 'PORT=8080\nAPP_NAME=SuperApp\n');

    const code = await runCLI([
      '--env',
      envFile,
      '--example',
      exampleFile,
      '--quiet'
    ]);
    assert.equal(code, 0);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('runCLI returns exit code 1 when keys are missing or invalid in strict', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-guard-test-'));
    const exampleFile = path.join(tempDir, '.env.example');
    const envFile = path.join(tempDir, '.env');

    fs.writeFileSync(exampleFile, 'PORT=3000\nSECRET_KEY=required\n');
    fs.writeFileSync(envFile, 'PORT=invalid_port\n'); // missing SECRET_KEY + invalid PORT

    const code = await runCLI([
      '--env',
      envFile,
      '--example',
      exampleFile,
      '--strict',
      '--quiet'
    ]);
    assert.equal(code, 1);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
