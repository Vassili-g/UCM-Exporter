import normalizeName from '../utils';

type Contract = any;

export async function handleExportComponent() {
  const selection = figma.currentPage.selection;
  if (!selection || selection.length === 0) {
    figma.notify('No selection. Please select a Component Set.');
    return;
  }
  const node = selection[0];
  if (node.type !== 'COMPONENT_SET') {
    figma.notify('Selection is not a COMPONENT_SET.');
    return;
  }

  const componentSet = node as ComponentSetNode;

  // Step 1 — Props
  const props: Record<string, any> = {};
  try {
    const defs = (componentSet as any).componentPropertyDefinitions || [];
    for (const def of defs) {
      const name = def.name || def.propertyName || 'unknown';
      const key = name.toLowerCase();
      if (def.type === 'VARIANT' || def.propertyType === 'VARIANT') {
        props[key] = { type: 'enum', values: def.values || def.options || [], default: def.default || (def.values && def.values[0]) };
      } else if (def.type === 'BOOLEAN' || def.propertyType === 'BOOLEAN') {
        props[key] = { type: 'boolean', default: false };
      } else {
        props[key] = { type: 'string', default: null };
      }
    }
  } catch (err) {
    // defensive
  }

  // Try to find internal wrapper props (size/iconPosition) by name
  // This is a heuristic: check componentSet.children for instances named sizeWrapperButton
  const wrapper = componentSet.findOne(n => n.name && n.name.toLowerCase().includes('sizewrapper')) as any;
  if (wrapper) {
    // default sizes
    props['size'] = props['size'] || { type: 'enum', values: ['big','medium','small'], default: 'medium' };
    props['iconPosition'] = props['iconPosition'] || { type: 'enum', values: ['left','right'], default: 'left' };
  }

  // Assemble a minimal contract following the spec (placeholders for parts needing deeper Figma APIs)
  const contract: Contract = {
    name: componentSet.name || 'Component',
    props,
    structure: {
      layout: 'flex-row',
      gap: null,
      padding: { x: null, y: null },
      radius: null,
      children: [],
      stateTokens: {}
    },
    tokensUsed: [],
    intent: null,
    warnings: []
  };

  // Typographie: try to locate a text node inside the component
  const textNode = componentSet.findOne(n => n.type === 'TEXT') as TextNode | null;
  if (textNode) {
    if (textNode.textStyleId) {
      try {
        const style = await figma.getStyleByIdAsync(textNode.textStyleId) as TextStyle;
        contract.structure.children.push({ slot: 'label', typography: normalizeName(style.name) });
      } catch (e) {
        contract.structure.children.push({ slot: 'label', typography: 'unknown' });
        contract.warnings.push('Failed to resolve text style name');
      }
    } else {
      // attempt to read bound variables (simplified)
      contract.structure.children.push({ slot: 'label', typography: { fontSize: 'size.fontsize.base', fontWeight: 'layout.fontweight.600', lineHeight: 'layout.lineheight.base', fontFamily: 'layout.fontfamily.base' } });
    }
  }

  // Intent: parse description tags
  try {
    const desc = componentSet.description || '';
    const intent: any = { usage: null, do: [], dont: [], pairs: [] };
    const usageMatch = desc.match(/@usage\s+([^\n]+)/i);
    if (usageMatch) intent.usage = usageMatch[1].trim();
    const doMatches = [...desc.matchAll(/@do\s+([^\n]+)/ig)];
    for (const m of doMatches) intent.do.push(m[1].trim());
    const dontMatches = [...desc.matchAll(/@dont\s+([^\n]+)/ig)];
    for (const m of dontMatches) intent.dont.push(m[1].trim());
    const pairsMatch = desc.match(/@pairs\s+([^\n]+)/i);
    if (pairsMatch) intent.pairs = pairsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    if (intent.usage || intent.do.length || intent.dont.length || intent.pairs.length) contract.intent = intent; else contract.intent = null;
  } catch (e) {
    // ignore
  }

  // tokensUsed: deduplicate (currently none discovered)
  contract.tokensUsed = Array.from(new Set(contract.tokensUsed));

  // Send to UI to trigger download
  figma.ui.postMessage({ type: 'download', filename: `${contract.name}.contract.json`, content: JSON.stringify(contract, null, 2) });
  figma.notify('Button contract prepared — check UI to download.');
}

export default handleExportComponent;
