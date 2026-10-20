import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  BookSchema,
  VersionIndexSchema,
  type VersionEntry,
  type VersionIndex,
  type VersionInfo,
} from '@rmp/model';
import { convertBook } from './book.js';
import { FsSource, GitSource, type SourceReader } from './source.js';

const run = promisify(execFile);

async function git(repoDir: string, args: string[]): Promise<string> {
  const { stdout } = await run('git', args, { cwd: repoDir, maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

/** Versions are the commits of the first-parent history of `ref`, newest first; tags name them. */
export async function listVersions(repoDir: string, ref = 'HEAD'): Promise<VersionInfo[]> {
  const log = await git(repoDir, ['log', '--first-parent', '--format=%H%x1f%cI%x1f%s', ref]);
  const refs = await git(repoDir, [
    'for-each-ref',
    'refs/tags',
    '--format=%(objectname)%1f%(*objectname)%1f%(refname:short)',
  ]);
  const tagsBySha = new Map<string, string[]>();
  for (const line of refs.split('\n')) {
    if (line === '') continue;
    const [object, target, name] = line.split('\x1f');
    const sha = target || object;
    if (!sha || !name) continue;
    tagsBySha.set(sha, [...(tagsBySha.get(sha) ?? []), name]);
  }
  return log
    .split('\n')
    .filter((l) => l !== '')
    .map((line) => {
      const [sha, date, subject] = line.split('\x1f') as [string, string, string];
      return { sha, date, subject, tags: (tagsBySha.get(sha) ?? []).sort() };
    });
}

const isoWithOffset = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off < 0 ? '-' : '+';
  const abs = Math.abs(off);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
};

async function convertOne(
  make: () => SourceReader & { close?: () => void },
  info: VersionInfo,
  dataDir: string,
): Promise<VersionEntry> {
  const source = make();
  try {
    const book = BookSchema.parse(await convertBook(source, info));
    const model = `versions/${info.sha}.json`;
    await writeFile(path.join(dataDir, model), JSON.stringify(book));
    return { ...info, available: true, error: null, model };
  } finally {
    source.close?.();
  }
}

/** Converts every version into `dataDir/versions/<sha>.json` and writes `dataDir/versions.json`. */
export async function buildArchive(
  repoDir: string,
  dataDir: string,
  opts: { ref?: string; workingTree?: boolean } = {},
): Promise<VersionIndex> {
  const ref = opts.ref ?? 'HEAD';
  const infos = await listVersions(repoDir, ref);
  if (infos.length === 0) throw new Error(`no commits found from ${ref}`);
  await mkdir(path.join(dataDir, 'versions'), { recursive: true });

  const versions: VersionEntry[] = [];
  if (opts.workingTree) {
    const info: VersionInfo = {
      sha: 'working-tree',
      subject: 'Working tree',
      tags: [],
      date: isoWithOffset(new Date()),
    };
    versions.push(await convertOne(() => new FsSource(repoDir), info, dataDir));
  }
  for (const [i, info] of infos.entries()) {
    try {
      versions.push(await convertOne(() => new GitSource(repoDir, info.sha), info, dataDir));
    } catch (e) {
      if (i === 0 && !opts.workingTree) throw e;
      versions.push({ ...info, available: false, error: e instanceof Error ? e.message : String(e), model: null });
    }
  }

  const index = VersionIndexSchema.parse({ schemaVersion: 1, latest: versions[0]!.sha, versions });
  await writeFile(path.join(dataDir, 'versions.json'), JSON.stringify(index, null, 2));
  return index;
}
