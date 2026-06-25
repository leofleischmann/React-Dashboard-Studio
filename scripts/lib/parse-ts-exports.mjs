// Collect exported symbol names from TypeScript entry files (no code execution).

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';

function resolveModule(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    if (statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function scriptKind(filePath) {
  return filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/**
 * @param {string} entryPath
 * @returns {{ values: string[], types: string[] }}
 */
export function collectExports(entryPath) {
  const seen = new Set();
  const valueExports = new Set();
  const typeExports = new Set();

  function addValue(name) {
    if (name && !name.startsWith('_')) valueExports.add(name);
  }

  function addType(name) {
    if (name && !name.startsWith('_')) typeExports.add(name);
  }

  function visit(filePath) {
    const normalized = resolve(filePath);
    if (seen.has(normalized)) return;
    seen.add(normalized);

    const content = readFileSync(normalized, 'utf8');
    const source = ts.createSourceFile(
      normalized,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind(normalized),
    );

    for (const stmt of source.statements) {
      if (ts.isExportDeclaration(stmt)) {
        const isTypeOnlyExport = Boolean(stmt.isTypeOnly);
        const modulePath =
          stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)
            ? resolveModule(normalized, stmt.moduleSpecifier.text)
            : null;

        if (stmt.exportClause) {
          if (ts.isNamespaceExport(stmt.exportClause)) {
            if (modulePath) {
              const nested = collectExports(modulePath);
              nested.values.forEach(addValue);
              nested.types.forEach(addType);
            }
          } else if (ts.isNamedExports(stmt.exportClause)) {
            for (const el of stmt.exportClause.elements) {
              const exported = (el.name ?? el.propertyName)?.text;
              if (!exported) continue;
              if (el.isTypeOnly || isTypeOnlyExport) addType(exported);
              else addValue(exported);
            }
          }
        } else if (modulePath) {
          const nested = collectExports(modulePath);
          nested.values.forEach(addValue);
          nested.types.forEach(addType);
        }
        continue;
      }

      const mods = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
      const isExport = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExport) continue;

      if (ts.isFunctionDeclaration(stmt) && stmt.name) addValue(stmt.name.text);
      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) addValue(decl.name.text);
        }
      }
      if (ts.isClassDeclaration(stmt) && stmt.name) addValue(stmt.name.text);
      if (ts.isEnumDeclaration(stmt)) addValue(stmt.name.text);
      if (ts.isTypeAliasDeclaration(stmt)) addType(stmt.name.text);
      if (ts.isInterfaceDeclaration(stmt)) addType(stmt.name.text);
    }
  }

  visit(entryPath);
  return {
    values: [...valueExports].sort(),
    types: [...typeExports].sort(),
  };
}
