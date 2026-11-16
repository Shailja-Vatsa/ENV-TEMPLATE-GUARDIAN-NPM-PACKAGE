/**
 * Parses raw .env content into a Map of key -> entry objects.
 * Pure JavaScript, zero external dependencies.
 *
 * Supports:
 * - Single quotes ('...')
 * - Double quotes ("...") with escape sequences (\n, \t, \", \\)
 * - Multiline values across lines
 * - Comments (#) and inline comments
 * - export prefix (e.g. `export PORT=3000`)
 * - Blank lines and whitespace
 *
 * @param {string} content
 * @returns {Map<string, { key: string, value: string, raw: string, line: number }>}
 */
export function parseEnv(content) {
  const result = new Map();
  const lines = content.split(/\r?\n/);
  let currentKey = '';
  let currentValue = '';
  let rawValue = '';
  let inMultiline = false;
  let multilineQuote = '';
  let startLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    if (inMultiline) {
      const closeIdx = findClosingQuote(line, multilineQuote);
      if (closeIdx !== -1) {
        const valuePart = line.slice(0, closeIdx);
        currentValue += '\n' + valuePart;
        rawValue += '\n' + line;
        inMultiline = false;

        const resolvedValue =
          multilineQuote === '"' ? unescapeDoubleQuoted(currentValue) : currentValue;

        result.set(currentKey, {
          key: currentKey,
          value: resolvedValue,
          raw: rawValue,
          line: startLine
        });

        currentKey = '';
        currentValue = '';
        rawValue = '';
      } else {
        currentValue += '\n' + line;
        rawValue += '\n' + line;
      }
      continue;
    }

    const trimmed = line.trim();

    // Skip empty lines and full comment lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Match KEY=VALUE or export KEY=VALUE
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const valPart = match[2];
    startLine = lineNumber;

    // Check for quoted start
    const trimmedVal = valPart.trimStart();
    const firstChar = trimmedVal[0];

    if (firstChar === '"' || firstChar === "'") {
      const quoteChar = firstChar;
      const quoteStartIdx = valPart.indexOf(quoteChar);
      const afterStart = valPart.slice(quoteStartIdx + 1);

      const closeIdx = findClosingQuote(afterStart, quoteChar);
      if (closeIdx !== -1) {
        // Closed on the same line
        const contentInside = afterStart.slice(0, closeIdx);
        const resolved =
          quoteChar === '"' ? unescapeDoubleQuoted(contentInside) : contentInside;

        result.set(key, {
          key,
          value: resolved,
          raw: line,
          line: lineNumber
        });
      } else {
        // Starts a multiline quoted string
        inMultiline = true;
        multilineQuote = quoteChar;
        currentKey = key;
        currentValue = afterStart;
        rawValue = line;
      }
      continue;
    }

    // Unquoted value: strip trailing inline comments
    let unquotedValue = valPart;
    const inlineCommentMatch = valPart.match(/\s+#.*$/);
    if (inlineCommentMatch && inlineCommentMatch.index !== undefined) {
      unquotedValue = valPart.slice(0, inlineCommentMatch.index);
    }
    unquotedValue = unquotedValue.trim();

    result.set(key, {
      key,
      value: unquotedValue,
      raw: line,
      line: lineNumber
    });
  }

  return result;
}

function findClosingQuote(str, quote) {
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '\\' && quote === '"') {
      escaped = !escaped;
      continue;
    }
    if (char === quote && !escaped) {
      return i;
    }
    escaped = false;
  }
  return -1;
}

function unescapeDoubleQuoted(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Infers the data type from an example template value.
 * Supported types: 'port', 'number', 'boolean', 'url', 'email', 'json', 'string'
 *
 * @param {string} value
 * @returns {'port' | 'number' | 'boolean' | 'url' | 'email' | 'json' | 'string'}
 */
export function inferType(value) {
  const trimmed = String(value ?? '').trim();

  if (trimmed === '') {
    return 'string';
  }

  // Boolean: true, false, 1, 0 (case insensitive)
  if (/^(true|false)$/i.test(trimmed)) {
    return 'boolean';
  }

  // Integer / Port check
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isInteger(num) && num >= 1 && num <= 65535) {
      return 'port';
    }
    return 'number';
  }

  // Float or signed integer
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return 'number';
  }

  // URL (http://, https://, postgres://, redis://, mongodb://, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/.test(trimmed)) {
    return 'url';
  }

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'email';
  }

  // JSON
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // not valid json
    }
  }

  return 'string';
}

/**
 * Tests whether an actual value matches the expected inferred type.
 *
 * @param {string} actualValue
 * @param {string} expectedType
 * @returns {boolean}
 */
export function matchesType(actualValue, expectedType) {
  const trimmed = String(actualValue ?? '').trim();

  if (trimmed === '') {
    return true; // Empty values are flagged by the empty check
  }

  switch (expectedType) {
    case 'boolean':
      return /^(true|false|0|1)$/i.test(trimmed);

    case 'port': {
      if (!/^\d+$/.test(trimmed)) return false;
      const port = Number(trimmed);
      return Number.isInteger(port) && port >= 1 && port <= 65535;
    }

    case 'number':
      return /^-?\d+(\.\d+)?$/.test(trimmed) && !isNaN(Number(trimmed));

    case 'url':
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/.test(trimmed);

    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    case 'json':
      try {
        JSON.parse(trimmed);
        return true;
      } catch {
        return false;
      }

    case 'string':
    default:
      return true;
  }
}
