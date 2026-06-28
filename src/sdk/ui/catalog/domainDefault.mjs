// Single source of truth for "which widget is the default for this HA domain".
//
// Used by BOTH the runtime entity inserter (catalog/index.ts → widgetNameForDomain)
// and the build-time SDK reference (scripts/lib/parse-widget-catalog.mjs), so the
// inserter and the docs can never disagree — they previously had two separate
// implementations that diverged (e.g. the `number` domain).
//
// Operates purely on widget metadata (name / domains / category / inserterDefault),
// so both the full WidgetCatalogEntry objects and the build's parsed metadata work.
// Plain JS so the Node build script imports it directly; types in the .d.ts.

function category(entry) {
  return entry.category ?? 'domain';
}

/** The default widget name an entity-inserter should use for `domain`. */
export function resolveDomainDefault(entries, domain) {
  // 1. a featured widget explicitly marked as the inserter default
  const featDefault = entries.find(
    (e) => e.inserterDefault && category(e) === 'featured' && e.domains.includes(domain),
  );
  if (featDefault) return featDefault.name;

  // 2. a domain card explicitly marked as the inserter default
  const domDefault = entries.find(
    (e) => e.inserterDefault && category(e) === 'domain' && e.domains.includes(domain),
  );
  if (domDefault) return domDefault.name;

  // 3. any single-entity widget that targets the domain (composite widgets need
  //    several entities, so they are never a per-entity inserter default)
  const single = entries.find(
    (e) => category(e) !== 'composite' && e.domains.includes(domain),
  );
  if (single) return single.name;

  // 4. generic fallback
  return 'EntityRow';
}

/** domain → default widget name, for every domain any widget targets. */
export function domainDefaultWidgets(entries) {
  const domains = new Set();
  for (const entry of entries) {
    for (const d of entry.domains) domains.add(d);
  }
  const out = {};
  for (const domain of domains) out[domain] = resolveDomainDefault(entries, domain);
  return out;
}
