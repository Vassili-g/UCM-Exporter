const { execSync } = require('child_process');

function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  const segments = name.split('/').map(s => s.trim()).filter(Boolean);
  const normalized = segments.map(seg => seg.replace(/\s+/g, '-').toLowerCase()).join('.');
  return normalized.replace(/\.\.+/g, '.');
}

const examples = [
  'Brand Tokens/Primary/default',
  'Primitives / Terracota / 600',
  'Font Size/Base',
  '  Brand  Tokens / Secondary / Emphasis  ',
  ''
];

console.log('Testing normalizeName:');
examples.forEach(e => console.log(`'${e}' -> '${normalizeName(e)}'`));

// Exit non-zero if a known mapping fails
const expected = {
  'Brand Tokens/Primary/default': 'brand-tokens.primary.default',
  'Primitives / Terracota / 600': 'primitives.terracota.600',
  'Font Size/Base': 'font-size.base',
  '  Brand  Tokens / Secondary / Emphasis  ': 'brand-tokens.secondary.emphasis',
  '': ''
};

let failed = 0;
for (const k of Object.keys(expected)) {
  const got = normalizeName(k);
  if (got !== expected[k]) {
    console.error(`Mismatch: '${k}' -> '${got}' (expected '${expected[k]}')`);
    failed++;
  }
}

process.exit(failed > 0 ? 1 : 0);
