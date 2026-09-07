/**
 * Rejoue le contrôle de style sur le fichier qu'un agent vient d'écrire.
 *
 * Branché en `PostToolUse` sur `Write` et `Edit` par `.claude/settings.json`.
 * Le retour arrive à l'agent au moment de l'écriture, avant la relecture et
 * avant la CI. Une instruction en mémoire est du contexte, que le défaut
 * verbeux d'un modèle recouvre ; un hook est de la configuration, et il
 * s'exécute.
 *
 * Le contrôle lui-même vit dans `controle-style.mjs`, que le test de la suite
 * appelle aussi. Le hook ne juge rien de son côté : il ne fait que choisir le
 * moment.
 *
 * Ce que le hook ne couvre pas : un agent d'un autre outillage, un éditeur
 * humain, une correction faite en ligne sur la forge. C'est pourquoi le même
 * contrôle est aussi un test de `npm test`, qui est la barrière.
 *
 * Le fichier reste écrit. Sortie 2, qui rend le texte de l'erreur à l'agent
 * pour qu'il corrige, plutôt que sortie 1, qui n'irait qu'au journal.
 *
 * Node lit l'entrée standard lui-même : ce dépôt tourne sous Windows, où `jq`
 * n'est pas installé.
 */
import fs from 'node:fs';
import path from 'node:path';

import { fautesDuFichier, horsPerimetre, racine, rapport } from './controle-style.mjs';

/** Le JSON que le hook reçoit sur son entrée standard, ou rien. */
async function demande() {
  const morceaux = [];
  for await (const bloc of process.stdin) morceaux.push(bloc);
  const brut = morceaux.join('').trim();
  if (brut === '') return null;
  try {
    return JSON.parse(brut);
  } catch {
    return null;
  }
}

const entree = await demande();
const vise = entree?.tool_response?.filePath ?? entree?.tool_input?.file_path;
if (!vise) process.exit(0);

const chemin = path.relative(racine, path.resolve(vise)).split(path.sep).join('/');
if (chemin.startsWith('..') || horsPerimetre(chemin)) process.exit(0);
if (!/\.(md|ts|tsx|mjs|cjs)$/.test(chemin)) process.exit(0);

const complet = path.join(racine, chemin);
if (!fs.existsSync(complet)) process.exit(0);

const fautes = fautesDuFichier(chemin, fs.readFileSync(complet, 'utf8'));
if (fautes.length === 0) process.exit(0);

process.stderr.write(
  `Le style du dépôt refuse ${fautes.length} passage(s) de ${chemin}.\n`
    + 'Corriger avant de continuer. Les règles vivent dans CONTRIBUTING.md, section\n'
    + '« Rédiger un document », et dans la skill .agents/skills/rediger-sans-tics-ia.\n\n'
    + `${rapport(fautes)}`,
);
process.exit(2);
