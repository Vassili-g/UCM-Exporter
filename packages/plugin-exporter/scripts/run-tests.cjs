/** Lance les tests `*.test.ts` d'UCM Exporter, par le découvreur du socle. */
const path = require('path');
const { lancerLesTests } = require('ucm-plugin-socle/build/run-tests.cjs');

lancerLesTests({ racine: path.resolve(__dirname, '..'), extensions: ['.test.ts'], nom: 'le plugin' });
