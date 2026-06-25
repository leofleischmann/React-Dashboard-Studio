// GitHub/HACS release notes from commits since the previous version tag.

import { execSync } from 'node:child_process';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/release-notes.mjs <version>');
  process.exit(1);
}

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf8' }).trim();
}

function listVersionTags() {
  try {
    return git('tag -l "v*" --sort=-v:refname').split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseVersion(tag) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function previousTag(version) {
  const target = parseVersion(`v${version}`);
  if (!target) return listVersionTags().find((tag) => tag !== `v${version}`) ?? null;

  let best = null;
  let bestParsed = null;
  for (const tag of listVersionTags()) {
    const parsed = parseVersion(tag);
    if (!parsed || compareVersions(parsed, target) >= 0) continue;
    if (!bestParsed || compareVersions(parsed, bestParsed) > 0) {
      best = tag;
      bestParsed = parsed;
    }
  }
  return best;
}

function commitsSince(range) {
  try {
    const out = git(`log ${range} --pretty=format:%s --no-merges`);
    return out ? out.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

const prev = previousTag(version);
const messages = prev ? commitsSince(`${prev}..HEAD`) : commitsSince('HEAD');

const heading = `## ${version}`;
if (messages.length === 0) {
  const scope = prev ? `seit \`${prev}\`` : 'im Repository';
  console.log(`${heading}\n\nKeine Commits ${scope}.`);
  process.exit(0);
}

const intro = prev ? `Commits seit \`${prev}\`:\n\n` : '';
const bullets = messages.map((subject) => `- ${subject}`).join('\n');
console.log(`${heading}\n\n${intro}${bullets}`);
