// ANSI terminal escape codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const WHITE = '\x1b[37m';
const GRAY = '\x1b[90m';

function pad(str, len) {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  const diff = len - stripped.length;
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

export function printHeader(envPath, examplePath) {
  console.log(`\nenv-guardian ${DIM}v1.0.0${RESET}`);
  console.log(`${GRAY}Target:${RESET} ${WHITE}${envPath}${RESET} ${GRAY}| Template:${RESET} ${WHITE}${examplePath}${RESET}\n`);
}

export function printIssuesTable(issues) {
  if (issues.length === 0) {
    return;
  }

  const colKeyLen = Math.max(12, ...issues.map((i) => i.key.length)) + 2;
  const colStatusLen = 10;
  const colTypeLen = 16;
  const colMsgLen = Math.min(
    60,
    Math.max(20, ...issues.map((i) => (i.message || '').length))
  );

  console.log(
    `  ${BOLD}${pad('VARIABLE', colKeyLen)} ${pad('LEVEL', colStatusLen)} ${pad('RULE', colTypeLen)} ${'DETAILS'}${RESET}`
  );
  console.log(
    `  ${GRAY}${'─'.repeat(colKeyLen + colStatusLen + colTypeLen + colMsgLen + 4)}${RESET}`
  );

  for (const issue of issues) {
    const isError = issue.severity === 'error';
    const statusBadge = isError
      ? `${RED}${BOLD}ERROR${RESET}`
      : `${YELLOW}${BOLD}WARN${RESET}`;

    let typeHint = issue.expectedType || issue.type || '-';
    if (issue.type === 'MISSING_KEY') {
      typeHint = issue.expectedType ? `missing (${issue.expectedType})` : 'missing';
    } else if (issue.type === 'EMPTY_VALUE') {
      typeHint = 'empty';
    } else if (issue.type === 'TYPE_MISMATCH') {
      typeHint = `type: ${issue.expectedType}`;
    } else if (issue.type === 'EXTRA_KEY') {
      typeHint = 'extra key';
    }

    const keyColor = isError ? RED : YELLOW;

    console.log(
      `  ${keyColor}${pad(issue.key, colKeyLen)}${RESET} ${pad(statusBadge, colStatusLen)} ${GRAY}${pad(typeHint, colTypeLen)}${RESET} ${WHITE}${issue.message}${RESET}`
    );
  }

  console.log('');
}

export function printSummary(result, strict) {
  const { valid, missingCount, emptyCount, mismatchCount, extraCount, exampleTotal, actualTotal } = result;

  const totalErrors = result.issues.filter((i) => i.severity === 'error').length;
  const totalWarnings = result.issues.filter((i) => i.severity === 'warning').length;

  if (valid && totalWarnings === 0) {
    console.log(
      `  ${GREEN}PASS${RESET} Environment variables validated (${actualTotal} defined, ${exampleTotal} template entries).\n`
    );
    return;
  }

  if (valid && totalWarnings > 0) {
    console.log(
      `  ${YELLOW}WARN${RESET} Validation completed with ${totalWarnings} warning(s).`
    );
    console.log(
      `  ${GRAY}Missing: ${missingCount} | Empty: ${emptyCount} | Type mismatches: ${mismatchCount} | Extra: ${extraCount}${RESET}\n`
    );
    return;
  }

  console.log(
    `  ${RED}FAIL${RESET} ${totalErrors} error(s), ${totalWarnings} warning(s).`
  );
  console.log(
    `  ${GRAY}Missing: ${missingCount} | Empty: ${emptyCount} | Type mismatches: ${mismatchCount} | Extra: ${extraCount}${RESET}`
  );
  if (missingCount > 0) {
    console.log(`  Run with --fix to supply missing variables.\n`);
  } else {
    console.log('');
  }
}
