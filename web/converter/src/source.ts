import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ConversionError } from './errors.js';

/** Reads source files by repo-relative POSIX path. */
export interface SourceReader {
  readText(path: string): Promise<string>;
}

export function texPath(ref: string): string {
  return ref.endsWith('.tex') ? ref : `${ref}.tex`;
}

const notFound = (p: string) => new ConversionError(null, `file not found: ${p}`);

export class FsSource implements SourceReader {
  constructor(private readonly rootDir: string) {}

  async readText(p: string): Promise<string> {
    try {
      return await readFile(path.join(this.rootDir, p), 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT' || (e as NodeJS.ErrnoException).code === 'EISDIR') {
        throw notFound(p);
      }
      throw e;
    }
  }
}

type Pending = { resolve: (b: Buffer | null) => void; reject: (e: Error) => void };

export class GitSource implements SourceReader {
  private readonly child: ChildProcessWithoutNullStreams;
  private buf: Buffer = Buffer.alloc(0);
  private readonly pending: Pending[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private failure: Error | null = null;

  constructor(
    repoDir: string,
    private readonly commit: string,
  ) {
    this.child = spawn('git', ['cat-file', '--batch'], { cwd: repoDir, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stdout.on('data', (chunk: Buffer) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      this.drain();
    });
    this.child.on('error', (e) => this.fail(e));
    this.child.on('close', (code) => this.fail(new Error(`git cat-file exited unexpectedly (code ${code})`)));
    this.child.stdin.on('error', () => {});
  }

  private fail(e: Error): void {
    this.failure ??= e;
    for (const p of this.pending.splice(0)) p.reject(e);
  }

  private drain(): void {
    for (;;) {
      const head = this.pending[0];
      if (!head) return;
      const nl = this.buf.indexOf(0x0a);
      if (nl < 0) return;
      const header = this.buf.subarray(0, nl).toString('utf8');
      if (header.endsWith(' missing') || header.endsWith(' ambiguous')) {
        this.buf = this.buf.subarray(nl + 1);
        this.pending.shift();
        head.resolve(null);
        continue;
      }
      const m = /^[0-9a-f]+ (\S+) (\d+)$/.exec(header);
      if (!m) {
        this.pending.shift();
        head.reject(new Error(`unexpected git cat-file reply: ${header}`));
        this.buf = Buffer.alloc(0);
        return;
      }
      const size = Number(m[2]);
      if (this.buf.length < nl + 1 + size + 1) return;
      const content = Buffer.from(this.buf.subarray(nl + 1, nl + 1 + size));
      this.buf = this.buf.subarray(nl + 1 + size + 1);
      this.pending.shift();
      head.resolve(m[1] === 'blob' ? content : null);
    }
  }

  private request(p: string): Promise<Buffer | null> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.child.stdin.write(`${this.commit}:${p}\n`);
    });
  }

  readText(p: string): Promise<string> {
    const run = async (): Promise<string> => {
      const content = await this.request(p);
      if (content === null) throw notFound(p);
      return content.toString('utf8');
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  close(): void {
    this.child.stdin.end();
  }
}
