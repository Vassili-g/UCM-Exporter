// Entry point for the plugin (placeholder)
figma.showUI(__html__, { width: 400, height: 300 });

figma.ui.onmessage = (msg) => {
  if (msg.type === 'export-component') {
    figma.ui.postMessage({ type: 'log', text: 'Export component not yet implemented' });
  }
  if (msg.type === 'export-tokens') {
    figma.ui.postMessage({ type: 'log', text: 'Export tokens not yet implemented' });
  }
};
