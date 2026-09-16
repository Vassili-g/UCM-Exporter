/** Choisit l'adaptateur de la forge qu'une configuration validée désigne. */
import type { GithubConfig } from '../config';
import type { Forge } from './forge';
import { forgeGithub } from './github';

export function forgeDe(config: GithubConfig): Forge {
  return forgeGithub(config);
}
