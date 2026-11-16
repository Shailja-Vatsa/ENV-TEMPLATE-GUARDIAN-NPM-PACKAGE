# env-template-guardian

Validate `.env` files against `.env.example` templates with type checking and interactive autofix.

## Features

- **Zero dependencies**: Uses Node.js standard library only.
- **Type inference**: Detects formats like `port`, `boolean`, `url`, `email`, `number`, and `json`.
- **Interactive fix**: `--fix` prompts for missing keys and appends them to `.env`.
- **CI ready**: Exit code `1` on failure, `0` on success.

## Usage

```bash
npx env-template-guardian
```

Or install as a dev dependency:

```bash
npm install --save-dev env-template-guardian
```

In `package.json`:

```json
{
  "scripts": {
    "env:check": "env-template-guardian --strict",
    "prebuild": "env-template-guardian --strict"
  }
}
```

## Options

- `-e, --env <path>`: Path to `.env` file (default: `.env`)
- `-x, --example <path>`: Path to template (default: `.env.example`)
- `-s, --strict`: Fail on type mismatches and extra variables
- `-f, --fix`: Prompt and append missing keys to `.env`
- `-q, --quiet`: Exit code only, no stdout
- `-v, --version`: Print version
- `-h, --help`: Show help

## Programmatic API

```javascript
import fs from 'node:fs';
import { parseEnv, validateEnv } from 'env-template-guardian';

const example = parseEnv(fs.readFileSync('.env.example', 'utf-8'));
const actual = parseEnv(fs.readFileSync('.env', 'utf-8'));

const report = validateEnv(example, actual, { strict: true });

if (!report.valid) {
  console.error(report.issues);
  process.exit(1);
}
```

## License

MIT
