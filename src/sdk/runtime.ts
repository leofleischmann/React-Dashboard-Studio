// The "standard library" available to dashboard code in the in-HA editor.
// User code resolves `import ... from '<name>'` against this registry.
//
// The module list itself lives in ./modules (the single source of truth);
// here we only derive the runtime shapes from it.

import { sdkModules } from './modules';

export const registry: Record<string, unknown> = Object.fromEntries(
  sdkModules.map((m) => [m.name, m.module]),
);

/** Names available to `import` — surfaced in the editor UI as a cheat sheet. */
export const availableModules = sdkModules
  .filter((m) => m.public)
  .map((m) => m.name);
