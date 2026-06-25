import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { hassStore } from '../sdk/hass/store';
import {
  ENTITY_ID_RE,
  isEntityIdContext,
  searchEntities,
} from '../sdk/hass/entitySearch';

const COMPLETION_LIMIT = 50;

function entityCompletionSource(ctx: CompletionContext): CompletionResult | null {
  const word = ctx.matchBefore(/['"][\w.]*$/);
  if (!word) return null;

  const line = ctx.state.doc.lineAt(ctx.pos);
  const linePrefix = line.text.slice(0, ctx.pos - line.from);
  if (!isEntityIdContext(linePrefix)) return null;

  const prefix = word.text.slice(1);
  const states = hassStore.getHass()?.states ?? {};
  const matches = searchEntities(states, prefix, COMPLETION_LIMIT);

  const options: Completion[] = matches.map((entity) => {
    const name = entity.attributes.friendly_name;
    const unit = entity.attributes.unit_of_measurement;
    const detail = name
      ? `${name} · ${entity.state}${unit ? ` ${unit}` : ''}`
      : `${entity.state}${unit ? ` ${unit}` : ''}`;

    return {
      label: entity.entity_id,
      detail,
      type: 'variable',
      apply: `'${entity.entity_id}'`,
    };
  });

  if (options.length === 0) return null;

  return {
    from: word.from + 1,
    options,
    validFor: ENTITY_ID_RE,
  };
}

export const entityAutocomplete = autocompletion({
  override: [entityCompletionSource],
  activateOnTyping: true,
  maxRenderedOptions: COMPLETION_LIMIT,
});
