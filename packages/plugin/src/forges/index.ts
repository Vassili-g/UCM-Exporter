/** Choisit l'adaptateur de la forge qu'une configuration validée désigne. */
import type { ConfigurationDuDepot } from '../config';
import type { Forge } from './forge';
import { forgeGithub } from './github';
import { forgeGitlab } from './gitlab';

const ADAPTATEURS = { github: forgeGithub, gitlab: forgeGitlab };

export function forgeDe(config: ConfigurationDuDepot): Forge {
  return ADAPTATEURS[config.forge](config);
}
