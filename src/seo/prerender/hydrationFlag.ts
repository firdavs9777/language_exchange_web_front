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
