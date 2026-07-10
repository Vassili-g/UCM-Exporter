// Entry point for the plugin (placeholder)
figma.showUI(__html__, { width: 400, height: 300 });

import handleExportComponent from './part1/exportComponent';

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'export-component') {
    await handleExportComponent();
  }
  if (msg.type === 'export-tokens') {
    figma.ui.postMessage({ type: 'log', text: 'Export tokens not yet implemented' });
  }
};
