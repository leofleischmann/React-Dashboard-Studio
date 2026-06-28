// Single source of truth for the module "standard library" available to
// dashboard code in the in-HA editor.
//
// Every other place that needs to know these module names derives from (or is
// drift-checked against) this manifest:
//   - src/sdk/runtime.ts        → builds the runtime `registry` + `availableModules`
//   - tsconfig.json `paths`     → local-dev types for `@ha/*` imports
//   - scripts/compile-check.mjs → the REGISTRY set used by CI / sync validation
//   - scripts/gen-sdk-reference → the documented module surface
//
// tests/sdk-modules.test.ts fails if any of those drift away from this list, so
// adding a new module is a one-line change here (+ its tsconfig path).

import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as hassApi from './hass/hooks';
import * as ui from './ui/index';
import * as layout from './ui/layout';
import * as format from './format';
import * as debug from './debug';

export interface SdkModule {
  /** Import specifier user code (and the tsconfig path) uses. */
  name: string;
  /** Namespace object resolved at runtime when user code imports `name`. */
  module: unknown;
  /**
   * `true` = part of the dashboard-author surface (the `@ha/*` modules shown in
   * the editor cheat sheet and documented). React internals stay `false`.
   */
  public: boolean;
  /**
   * Source entry relative to the repo root — the single source for the
   * `tsconfig.json` path and SDK-reference tooling. Empty for bundler-provided
   * modules (react) that have no `@ha/*` path mapping.
   */
  source: string;
}

export const sdkModules: SdkModule[] = [
  { name: 'react', module: React, public: false, source: '' },
  { name: 'react/jsx-runtime', module: ReactJsxRuntime, public: false, source: '' },
  { name: '@ha', module: hassApi, public: true, source: 'src/sdk/hass/hooks.ts' },
  { name: '@ha/ui', module: ui, public: true, source: 'src/sdk/ui/index.ts' },
  { name: '@ha/layout', module: layout, public: true, source: 'src/sdk/ui/layout.tsx' },
  { name: '@ha/format', module: format, public: true, source: 'src/sdk/format.ts' },
  { name: '@ha/debug', module: debug, public: true, source: 'src/sdk/debug/index.ts' },
];
