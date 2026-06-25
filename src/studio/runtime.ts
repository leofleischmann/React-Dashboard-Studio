// The "standard library" available to the dashboard code you write in the
// in-HA editor. User code resolves `import ... from '<name>'` against this
// registry — there is no real bundler at runtime, so only these modules exist.
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as hassApi from '../hass/hooks';
import * as ui from '../components/widgets';
import * as format from '../lib/format';

export const registry: Record<string, unknown> = {
  // React itself + the JSX runtime Sucrase compiles your JSX against.
  react: React,
  'react/jsx-runtime': ReactJsxRuntime,
  // Your Home Assistant API.
  '@ha': hassApi, // useEntity, useEntityAttribute, useEntities, useAreaEntities, useSun, useTime, useEntityHistory, callServiceWithTarget, …
  '@ha/ui': ui, // Card, Stat, LightTile, SelectCard, LockCard, VacuumCard, FanCard, AlarmPanel, CameraTile, TimerCard, CounterCard, SceneButton, ScriptButton, …
  '@ha/format': format, // num, temp, pct, power, energy, stateLabel, stateColor, relativeTime, duration, deviceClassIcon, …
};

/** Names available to `import` — surfaced in the editor UI as a cheat sheet. */
export const availableModules = Object.keys(registry).filter(
  (n) => !n.startsWith('react'),
);
