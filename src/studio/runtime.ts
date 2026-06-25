// The "standard library" available to the dashboard code you write in the
// in-HA editor. User code resolves `import ... from '<name>'` against this
// registry — there is no real bundler at runtime, so only these modules exist.
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as hassApi from '../hass/hooks';
import * as ui from '../components/widgets';
import * as layout from '../components/layout';
import * as format from '../lib/format';

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
