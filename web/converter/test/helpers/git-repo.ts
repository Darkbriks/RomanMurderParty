import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';

const created: string[] = [];

afterAll(() => {
  for (const d of created.splice(0)) rmSync(d, { recursive: true, force: true });
});

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

export async function makeRepo(
  commits: { files: Record<string, string>; message: string; tag?: string }[],
): Promise<{ dir: string; shas: string[] }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'rmp-repo-'));
  created.push(dir);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  const shas: string[] = [];
  for (const c of commits) {
    for (const [file, content] of Object.entries(c.files)) {
      const full = path.join(dir, file);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    git('add', '-A');
    git('commit', '-q', '--allow-empty', '-m', c.message);
    shas.push(git('rev-parse', 'HEAD'));
    if (c.tag) git('tag', '-a', c.tag, '-m', c.tag);
  }
  return { dir, shas };
}
