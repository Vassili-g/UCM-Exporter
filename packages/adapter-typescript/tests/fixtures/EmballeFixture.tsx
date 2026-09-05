/** Composant emballé dans les helpers React usuels. */
import { forwardRef, memo } from "react";
import { ParityFixture } from "./ParityFixture.tsx";

export interface EmballeFixtureProps {
  action?: boolean;
}

export const EmballeFixture = memo(
  forwardRef<HTMLDivElement, EmballeFixtureProps>(
    function EmballeFixture({ action }, ref) {
      return <div ref={ref}>{action ? <ParityFixture enabled /> : null}</div>;
    },
  ),
);
