import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { convertBook } from './book.js';
import { ConversionError } from './errors.js';
import { FsSource } from './source.js';

/** Current time as an ISO string with a numeric UTC offset. */
function nowWithOffset(): string {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');
  const sign = off >= 0 ? '+' : '-';
  const local = new Date(d.getTime() + off * 60000).toISOString().slice(0, 19);
  return `${local}${sign}${pad(off / 60)}:${pad(off % 60)}`;
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { src: { type: 'string' }, out: { type: 'string' } },
  });
  if (positionals[0] !== 'book' || !values.src || !values.out) {
    console.error('usage: cli.ts book --src <repoRoot> --out <file.json>');
    process.exit(2);
  }
  const book = await convertBook(new FsSource(values.src), {
    sha: 'working-tree', date: nowWithOffset(), subject: 'Working tree', tags: [],
  });
  await writeFile(values.out, `${JSON.stringify(book, null, 2)}\n`);
}

main().catch((e: unknown) => {
  if (e instanceof ConversionError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
});
