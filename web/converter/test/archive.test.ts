import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BookSchema, VersionIndexSchema } from '@rmp/model';
import { afterAll, describe, expect, it } from 'vitest';
import { buildArchive, listVersions } from '../src/archive.js';
import { bookFiles } from './helpers/book-files.js';
import { makeRepo } from './helpers/git-repo.js';

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = (): string => {
  const d = mkdtempSync(path.join(tmpdir(), 'rmp-data-'));
  dirs.push(d);
  return d;
};
const identity = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};
const git = (dir: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, ...identity },
  }).trim();
const gitEnv = { GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@e.x', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@e.x' };

const threeCommits = (first: Record<string, string> = {}) => [
  { files: bookFiles(first), message: 'one' },
  { files: bookFiles({ 'parties/coda.tex': '\\partie{Coda}{Vivienne}\n\\chapitre{}\nDeux.\n' }), message: 'two', tag: 'v0.1' },
  { files: bookFiles({ 'parties/coda.tex': '\\partie{Coda}{Vivienne}\n\\chapitre{}\nTrois.\n' }), message: 'three' },
];

describe('listVersions', () => {
  it('follows first parent and maps tags', async () => {
    const { dir, shas } = await makeRepo(threeCommits());
    const versions = await listVersions(dir);
    expect(versions.map((v) => v.sha)).toEqual([shas[2], shas[1], shas[0]]);
    expect(versions.map((v) => v.tags)).toEqual([[], ['v0.1'], []]);
    expect(versions.map((v) => v.subject)).toEqual(['three', 'two', 'one']);
  });

  it('ignores tags outside the first-parent history', async () => {
    const { dir, shas } = await makeRepo(threeCommits());
    git(dir, 'checkout', '-q', '-b', 'side', shas[0]!);
    git(dir, 'commit', '-q', '--allow-empty', '-m', 'side');
    git(dir, 'tag', 'side-tag');
    git(dir, 'checkout', '-q', 'main');
    git(dir, 'merge', '-q', '--no-ff', 'side', '-m', 'merge');
    const versions = await listVersions(dir);
    expect(versions.map((v) => v.subject)).toEqual(['merge', 'three', 'two', 'one']);
    expect(versions.flatMap((v) => v.tags)).toEqual(['v0.1']);
  });
});

void gitEnv;

describe('buildArchive', () => {
  it('writes one model per version and an index', async () => {
    const { dir, shas } = await makeRepo(threeCommits());
    const out = tmp();
    const index = await buildArchive(dir, out);
    expect(index.latest).toBe(shas[2]);
    expect(index.versions.map((v) => v.available)).toEqual([true, true, true]);
    expect(VersionIndexSchema.parse(JSON.parse(readFileSync(path.join(out, 'versions.json'), 'utf8')))).toEqual(index);
    for (const sha of shas) {
      const book = BookSchema.parse(JSON.parse(readFileSync(path.join(out, 'versions', `${sha}.json`), 'utf8')));
      expect(book.meta.version.sha).toBe(sha);
    }
  });

  it('records a broken old version, not fatal', async () => {
    const { dir, shas } = await makeRepo(threeCommits({ 'parties/coda.tex': '\\foo\n' }));
    const index = await buildArchive(dir, tmp());
    const old = index.versions.find((v) => v.sha === shas[0])!;
    expect(old.available).toBe(false);
    expect(old.model).toBeNull();
    expect(old.error).toContain('unknown command \\foo');
    expect(index.versions[0]!.available).toBe(true);
  });

  it('fails on a broken head', async () => {
    const { dir } = await makeRepo([
      ...threeCommits(),
      { files: { 'parties/coda.tex': '\\foo\n' }, message: 'broken' },
    ]);
    await expect(buildArchive(dir, tmp())).rejects.toThrow(/unknown command \\foo/);
  });

  it('makes the working tree the latest version', async () => {
    const { dir } = await makeRepo(threeCommits());
    const out = tmp();
    const index = await buildArchive(dir, out, { workingTree: true });
    expect(index.latest).toBe('working-tree');
    expect(index.versions).toHaveLength(4);
    expect(index.versions[0]).toMatchObject({ sha: 'working-tree', subject: 'Working tree', available: true });
    BookSchema.parse(JSON.parse(readFileSync(path.join(out, 'versions', 'working-tree.json'), 'utf8')));
  });
});
