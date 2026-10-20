import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConversionError } from '../src/errors.ts';
import { FsSource, GitSource, texPath } from '../src/source.ts';
import { makeRepo } from './helpers/git-repo.ts';

describe('FsSource', () => {
  it('reads a file relative to the root', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'rmp-fs-'));
    try {
      await writeFile(path.join(dir, 'a.tex'), 'bonjour');
      expect(await new FsSource(dir).readText('a.tex')).toBe('bonjour');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws ConversionError for a missing file', async () => {
    const err = await new FsSource(tmpdir()).readText('nope.tex').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConversionError);
    expect((err as Error).message).toBe('file not found: nope.tex');
  });
});

describe('GitSource', () => {
  it('reads a file as it was at a given commit', async () => {
    const { dir, shas } = await makeRepo([
      { files: { 'a.tex': 'one é' }, message: 'first' },
      { files: { 'a.tex': 'two' }, message: 'second' },
    ]);
    const old = new GitSource(dir, shas[0]!);
    const cur = new GitSource(dir, shas[1]!);
    try {
      const [a, b, c] = await Promise.all([old.readText('a.tex'), cur.readText('a.tex'), old.readText('a.tex')]);
      expect([a, b, c]).toEqual(['one é', 'two', 'one é']);
    } finally {
      old.close();
      cur.close();
    }
  });

  it('throws ConversionError for a path absent at that commit', async () => {
    const { dir, shas } = await makeRepo([
      { files: { 'a.tex': 'x' }, message: 'first' },
      { files: { 'b.tex': 'y' }, message: 'second' },
    ]);
    const src = new GitSource(dir, shas[0]!);
    try {
      const err = await src.readText('b.tex').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConversionError);
      expect((err as Error).message).toBe('file not found: b.tex');
      expect(await src.readText('a.tex')).toBe('x');
    } finally {
      src.close();
    }
  });
});

describe('texPath', () => {
  it('adds the extension only when missing', () => {
    expect(texPath('parties/ouverture')).toBe('parties/ouverture.tex');
    expect(texPath('parties/ouverture.tex')).toBe('parties/ouverture.tex');
  });
});

describe('ConversionError', () => {
  it('formats file:line:column', () => {
    const e = new ConversionError({ file: 'a.tex', line: 3, column: 7 }, 'unknown command \\foo');
    expect(e.message).toBe('a.tex:3:7: unknown command \\foo');
    expect(new ConversionError(null, 'boom').message).toBe('boom');
  });
});
