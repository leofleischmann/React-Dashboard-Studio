import { describe, it, expect } from 'vitest';
import { EJECT_SOURCES } from '../src/sdk/ui/catalog/eject.generated';

// Guards the eject generator's cross-file inlining: SparkChart's pure helpers
// live in a sibling file (chartMath.ts) yet must be inlined into its eject
// source as local declarations — never left as a relative import.

describe('eject cross-file inlining', () => {
  const spark = EJECT_SOURCES.SparkChart;

  it('has an eject source for the split widget', () => {
    expect(spark).toBeDefined();
  });

  it('inlines helpers that were split into a sibling file', () => {
    expect(spark.body).toContain('function seriesDomain');
    expect(spark.body).toContain('function combinedTimeRange');
    expect(spark.body).toContain('function tooltipAlign');
  });

  it('never leaks the internal sibling module into imports', () => {
    const imports = spark.imports.join('\n');
    expect(imports).not.toContain('chartMath');
    expect(imports).not.toMatch(/from '\.\//); // no relative imports survive
  });

  it('still routes public symbols through their @ha alias', () => {
    expect(spark.imports.join('\n')).toContain("from '@ha'");
  });
});
