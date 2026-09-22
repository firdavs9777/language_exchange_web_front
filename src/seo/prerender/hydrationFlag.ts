// Set by index.tsx before hydrateRoot. Animations that start hidden and
// reveal on scroll consult it so the first client render matches the
// prerendered markup (which is always the "visible" state); on a prerendered
// page the reveal animation is skipped and content is simply there.
let prerendered = false;

export function markPrerendered(): void {
  prerendered = true;
}

export function isPrerendered(): boolean {
  return prerendered;
}

/**
 * Clear after the first commit (App.tsx). Components mounted during hydration
 * have already taken their initial state, so clearing here costs them nothing
 * and lets everything mounted later — every client-side navigation — animate
 * normally instead of being stuck in the "already visible" state for the
 * whole session.
 */
export function clearPrerendered(): void {
  prerendered = false;
}
