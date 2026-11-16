import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from './parser.js';
import { validateEnv } from './validator.js';
import { runInteractiveFix } from './fixer.js';
import { printHeader, printIssuesTable, printSummary } from './reporter.js';

export function printHelp() {
  console.log(`
Usage:
  env-guardian [options]

Options:
  -e, --env <path>       Path to .env file (default: .env)
  -x, --example <path>   Path to .env.example template (default: .env.example)
  -s, --strict           Fail on type mismatches and extra variables
  -f, --fix              Interactively prompt and append missing variables
  -q, --quiet            Suppress output, return status code only
  -v, --version          Print version
  -h, --help             Show help
`);
}

export function parseArgs(args) {
  const options = {
    envPath: '.env',
    examplePath: '.env.example',
    strict: false,
    fix: false,
    quiet: false,
    help: false,
    version: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '-s' || arg === '--strict') {
      options.strict = true;
    } else if (arg === '-f' || arg === '--fix') {
      options.fix = true;
    } else if (arg === '-q' || arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '-e' || arg === '--env') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.envPath = args[++i];
      }
    } else if (arg.startsWith('--env=')) {
      options.envPath = arg.slice(6);
    } else if (arg === '-x' || arg === '--example') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.examplePath = args[++i];
      }
    } else if (arg.startsWith('--example=')) {
      options.examplePath = arg.slice(10);
    }
  }

  return options;
}

export async function runCLI(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return 0;
  }

  if (options.version) {
    const pkgJsonPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../package.json'
    );
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      console.log(`env-guardian v${pkg.version}`);
    } catch {
      console.log('env-guardian v1.0.0');
    }
    return 0;
  }

  const envFullPath = path.resolve(process.cwd(), options.envPath);
  const exampleFullPath = path.resolve(process.cwd(), options.examplePath);

  if (!fs.existsSync(exampleFullPath)) {
    console.error(`Error: template file "${options.examplePath}" not found at ${exampleFullPath}`);
    return 1;
  }

  const exampleContent = fs.readFileSync(exampleFullPath, 'utf-8');
  const exampleMap = parseEnv(exampleContent);

  let envContent = '';
  let envMap = new Map();

  if (fs.existsSync(envFullPath)) {
    envContent = fs.readFileSync(envFullPath, 'utf-8');
    envMap = parseEnv(envContent);
  } else if (!options.quiet) {
    console.warn(`Warning: file "${options.envPath}" not found.`);
  }

  let result = validateEnv(exampleMap, envMap, {
    strict: options.strict,
    allowExtra: !options.strict
  });

  if (options.fix && result.missingCount > 0) {
    const missingIssues = result.issues.filter((i) => i.type === 'MISSING_KEY');
    await runInteractiveFix(envFullPath, missingIssues);

    if (fs.existsSync(envFullPath)) {
      const updatedEnvContent = fs.readFileSync(envFullPath, 'utf-8');
      envMap = parseEnv(updatedEnvContent);
      result = validateEnv(exampleMap, envMap, {
        strict: options.strict,
        allowExtra: !options.strict
      });
    }
  }

  if (!options.quiet) {
    printHeader(options.envPath, options.examplePath);
    printIssuesTable(result.issues);
    printSummary(result, options.strict);
  }

  return result.valid ? 0 : 1;
}
