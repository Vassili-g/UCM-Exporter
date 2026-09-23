/** Le préréglage Tailwind ([MOT-18] à [MOT-20]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RELEVE_TAILWIND,
  deriveTailwind,
  ecartAngulaire,
  lireHexa,
  prereglageTailwind,
  rgb8VersOklch,
  type PaireDeDerive,
} from '../src/index';

const BOUTS = { clair: 0.975, sombre: 0.27 };

test('le relevé par défaut porte les dix-sept rampes colorées de Tailwind', () => {
  assert.equal(RELEVE_TAILWIND.length, 17);
  assert.equal(new Set(RELEVE_TAILWIND.map(([nom]) => nom)).size, 17);
});

test('l’écart angulaire prend le plus court chemin', () => {
  assert.equal(ecartAngulaire(343.198, 3.907).toFixed(3), '20.709');
  assert.equal(ecartAngulaire(10, 350), -20);
  assert.equal(ecartAngulaire(0, 180), -180);
});

test('à la teinte claire d’une rampe du relevé, la dérive totale est celle de cette rampe', () => {
  for (const [nom, clair, sombre] of RELEVE_TAILWIND) {
    const obtenu = deriveTailwind(clair);
    assert.ok(Math.abs(obtenu - ecartAngulaire(clair, sombre)) < 1e-9, `${nom} : ${obtenu}`);
  }
});

test('entre pink et rose, l’interpolation passe par 0°', () => {
  // pink 343,198° dérive de +20,709 ; rose 12,422° de -0,328.
  const auMilieu = deriveTailwind((343.198 + 12.422 + 360) / 2 % 360);
  assert.ok(Math.abs(auMilieu - (20.709 + -0.328) / 2) < 1e-3, `${auMilieu}`);
});

test('[MOT-18] une référence presque grise rend deux dérives nulles', () => {
  const gris = rgb8VersOklch(lireHexa('#6B7280')!);
  assert.ok(gris.C < 0.03);
  assert.deepEqual(prereglageTailwind(gris, BOUTS), { clair: 0, sombre: 0 });
  assert.notDeepEqual(prereglageTailwind(gris, BOUTS, RELEVE_TAILWIND, 0.02), { clair: 0, sombre: 0 });
});

test('[MOT-19] la dérive totale se répartit selon la place de la référence dans la rampe', () => {
  const totale = 20;
  const releve: PaireDeDerive[] = [['a', 0, 20], ['b', 180, 200]];
  const reference = (L: number) => ({ L, C: 0.1, H: 90 });
  // Une référence au bout clair reçoit toute la dérive du côté sombre, et l'inverse.
  assert.deepEqual(prereglageTailwind(reference(0.975), BOUTS, releve), { clair: 0, sombre: totale });
  assert.deepEqual(prereglageTailwind(reference(0.27), BOUTS, releve), { clair: -totale, sombre: 0 });
  assert.deepEqual(prereglageTailwind(reference(0.99), BOUTS, releve), { clair: 0, sombre: totale });
});

test('[MOT-20] un relevé passé en paramètre remplace celui par défaut', () => {
  const reference = { L: 0.6, C: 0.1, H: 90 };
  const releve: PaireDeDerive[] = [['a', 0, 0], ['b', 180, 180]];
  assert.deepEqual(prereglageTailwind(reference, BOUTS, releve), { clair: 0, sombre: 0 });
});
