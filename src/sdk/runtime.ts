// The "standard library" available to dashboard code in the in-HA editor.
// User code resolves `import ... from '<name>'` against this registry.

import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as hassApi from './hass/hooks';
import * as ui from './ui/index';
import * as layout from './ui/layout';
import * as format from './format';

export const registry: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': ReactJsxRuntime,
  '@ha': hassApi,
  '@ha/ui': ui,
  '@ha/layout': layout,
  '@ha/format': format,
};

/** Names available to `import` — surfaced in the editor UI as a cheat sheet. */
export const availableModules = Object.keys(registry).filter(
  (n) => !n.startsWith('react'),
);
