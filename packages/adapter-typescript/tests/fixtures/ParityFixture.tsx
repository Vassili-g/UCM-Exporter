/** Fixture du vérificateur TypeScript de la parité contrat ↔ code. */
export interface ParityFixtureProps {
  enabled?: boolean;
  invalid?: string;
  nullable?: boolean | null;
  ignored?: boolean;
}

export function ParityFixture({ enabled }: ParityFixtureProps) {
  const runtime = { enabled };
  return runtime.enabled ? "actif" : "inactif";
}
