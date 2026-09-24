/** Extrait les propositions du document de relecture, sans modifier les textes du plugin. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../INVENTAIRE-TEXTES-ET-PROPOSITIONS.md'), 'utf8');
const decode = (text) => text.replace(/&#124;/g, '|').replace(/<br\s*\/?\s*>/g, '\n');
const stripCode = (text) => decode(text.replace(/^(`+) ([\s\S]*) \1$/, '$2'));

function variable(expression) {
  if (ts.isCallExpression(expression)) {
    const name = expression.expression.getText();
    const labels = { nomDe: 'palette', membre: 'usage', emploiEcrit: 'usage', uneDerive: 'réglages de teinte', texteDuRefus: 'détail de l’erreur', citer: 'noms des calques', referenceLue: 'couleur de référence', rangEcrit: 'position' };
    if (labels[name.split('.').pop()]) return labels[name.split('.').pop()];
    if (expression.arguments.length && !name.endsWith('join')) return variable(expression.arguments[0]);
    return 'liste';
  }
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text === 'length' ? 'nombre' : expression.name.text;
  if (ts.isElementAccessExpression(expression)) {
    const name = expression.expression.getText();
    return ({ ADJECTIF_DU_MODE: 'mode', NOM_DU_MODE: 'mode', MODES: 'mode', ESPACES: 'profil de couleur', ORIGINES: 'préréglage', ETATS_DU_DECALAGE: 'état', titres: 'type de changement' })[name] || name.split('.').pop();
  }
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isBinaryExpression(expression)) return variable(expression.left);
  return 'selon le cas';
}

function readable(raw) {
  if (!raw.startsWith('`') || !raw.endsWith('`')) return raw.replace(/\\n/g, '\n');
  const file = ts.createSourceFile('texte.ts', `const texte = ${raw};`, ts.ScriptTarget.Latest, true);
  const node = file.statements[0]?.declarationList?.declarations[0]?.initializer;
  if (node && ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map((span) => `{${variable(span.expression)}}${span.literal.text}`).join('');
  }
  return raw.slice(1, -1).replace(/\\n/g, '\n');
}

const entries = [];
let heading = '';
let section = '';
let vocabulary = 0;
for (const line of source.split(/\r?\n/)) {
  if (line.startsWith('## ')) { heading = line.slice(3); section = heading; }
  if (line.startsWith('### ')) section = line.slice(4);
  if (!line.startsWith('| ')) continue;
  const cells = line.slice(1, -1).split('|').map((cell) => cell.trim());
  const id = cells[0];
  if (/^[TH]\d{3}$/.test(id)) {
    const reference = /\[([^\]]+)\]\(([^)]+)\)/.exec(cells[1]);
    const raw = stripCode(cells[2]);
    entries.push({ id, section: id.startsWith('H') ? 'Autres textes et noms de calques' : section, original: readable(raw), raw, proposal: decode(cells[3]), note: decode(cells[4] || ''), reference: reference?.[1] || '', source: reference?.[2].replace('../../../../', '') || '', symbol: stripCode(cells[1].split(' · ').slice(1).join(' · ')), kind: 'texte' });
  } else if (/^A\d{2}$/.test(id)) {
    entries.push({ id, section: 'Aides supplémentaires', original: 'Aucun texte à cet emplacement aujourd’hui.', raw: '', proposal: decode(cells[2]), note: decode(cells[1]), kind: 'aide' });
  } else if (heading === 'Choix de vocabulaire à valider' && cells[0] !== 'Terme actuel' && !cells[0].startsWith('-')) {
    entries.push({ id: `V${String(++vocabulary).padStart(2, '0')}`, section: 'Vocabulaire commun', original: decode(cells[0]), raw: decode(cells[0]), proposal: decode(cells[1]), note: decode(cells[2]), kind: 'vocabulaire' });
  }
}
if (entries.filter((entry) => entry.kind === 'texte').length !== 445 || entries.filter((entry) => entry.kind === 'aide').length !== 5 || new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error('Inventaire incomplet ou identifiants répétés.');
const signature = crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
fs.writeFileSync(path.join(__dirname, 'donnees.js'), `window.RELECTURE = ${JSON.stringify({ signature, entries }, null, 2)};\n`, 'utf8');
console.log(`${entries.length} propositions prêtes à relire.`);
