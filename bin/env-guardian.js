#!/usr/bin/env node

import { runCLI } from '../src/cli.js';

runCLI().then((exitCode) => {
  process.exit(exitCode);
}).catch((err) => {
  console.error('\x1b[31mUnexpected error:\x1b[0m', err);
  process.exit(1);
});
