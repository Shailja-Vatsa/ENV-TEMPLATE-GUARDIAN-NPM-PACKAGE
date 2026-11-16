import readline from 'node:readline';
import fs from 'node:fs';

export async function runInteractiveFix(envPath, missingIssues) {
  if (missingIssues.length === 0) {
    return { fixedCount: 0, skippedCount: 0 };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) =>
    new Promise((resolve) => rl.question(query, resolve));

  console.log(`\nMissing variables detected. Enter values (press Enter for default, or 'skip'):\n`);

  const linesToAppend = [];
  let fixedCount = 0;
  let skippedCount = 0;

  try {
    for (const issue of missingIssues) {
      const { key, exampleValue, expectedType } = issue;
      const typeHint = expectedType && expectedType !== 'string' ? ` (${expectedType})` : '';
      const promptDefault = exampleValue ? ` [${exampleValue}]` : '';

      const answer = await question(`  ${key}${typeHint}${promptDefault}: `);
      const trimmed = answer.trim();

      if (trimmed.toLowerCase() === 'skip') {
        skippedCount++;
        continue;
      }

      const finalValue = trimmed === '' && exampleValue !== undefined ? exampleValue : trimmed;
      const needsQuotes = /[\s#"'\n]/.test(finalValue);
      const formattedLine = needsQuotes
        ? `${key}="${finalValue.replace(/"/g, '\\"')}"`
        : `${key}=${finalValue}`;

      linesToAppend.push(formattedLine);
      fixedCount++;
    }
  } finally {
    rl.close();
  }

  if (linesToAppend.length > 0) {
    let existingContent = '';
    if (fs.existsSync(envPath)) {
      existingContent = fs.readFileSync(envPath, 'utf-8');
    }

    const needsNewline =
      existingContent.length > 0 && !existingContent.endsWith('\n');
    const contentToAdd =
      (needsNewline ? '\n' : '') +
      linesToAppend.join('\n') +
      '\n';

    fs.appendFileSync(envPath, contentToAdd, 'utf-8');
    console.log(`\nUpdated ${envPath} with ${fixedCount} variable(s).\n`);
  }

  return { fixedCount, skippedCount };
}
