/**
 * Editable "eject" sources for the trivial domain widgets.
 *
 * Each returns a complete, self-contained component the user can paste into a
 * dashboard module instead of importing the black-box widget — full design
 * freedom. They lean only on `@ha` / `@ha/format` and the global widget CSS
 * classes (which ship with the panel), so they render styled out of the box and
 * can be rewritten freely from there.
 */

export function binaryBadgeSource(id: string): string {
  return `// import { useEntity } from '@ha';
function BinaryBadge({ entityId = "${id}", onLabel = "an", offLabel = "aus" }) {
  const entity = useEntity(entityId);
  const name = entity?.attributes.friendly_name ?? entityId;
  const on = entity?.state === "on";
  return (
    <div className={\`rd-card rd-binary \${on ? "is-on" : ""}\`}>
      <span className="rd-binary__dot" />
      <div className="rd-binary__text">
        <span className="rd-binary__name">{name}</span>
        <span className="rd-binary__state">{on ? onLabel : offLabel}</span>
      </div>
    </div>
  );
}`;
}

export function entityRowSource(id: string): string {
  return `// import { useEntity } from '@ha';
function EntityRow({ entityId = "${id}", label }) {
  const entity = useEntity(entityId);
  const name = label ?? entity?.attributes.friendly_name ?? entityId;
  const unit = entity?.attributes.unit_of_measurement;
  return (
    <div className="rd-card rd-entity-row">
      <div className="rd-entity-row__main">
        <span className="rd-entity-row__name">{name}</span>
        <span className="rd-entity-row__id">{entityId}</span>
      </div>
      <span className="rd-entity-row__state">
        {entity?.state ?? "–"}{unit ? \` \${unit}\` : ""}
      </span>
    </div>
  );
}`;
}

export function actionButtonSource(id: string): string {
  return `// import { useEntity, callService } from '@ha';
function ActionButton({ entityId = "${id}", label }) {
  const entity = useEntity(entityId);
  const [domain, name] = entityId.split(".");
  return (
    <button
      className="rd-card rd-action-btn"
      onClick={() => callService(domain, "turn_on", { entity_id: entityId })}
    >
      <span className="rd-action-btn__name">
        {label ?? entity?.attributes.friendly_name ?? name}
      </span>
      <span className="rd-action-btn__hint">{entityId}</span>
    </button>
  );
}`;
}
