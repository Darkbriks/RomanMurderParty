import { describe, expect, it } from 'vitest';
import { loadBook } from './load';

describe('load', () => {
  it('loadBook requests the versioned URL under base', async () => {
    const urls: string[] = [];
    const stub = (async (url: string) => {
      urls.push(url);
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    await loadBook(stub, '/RomanMurderParty', 'abc').catch(() => {});
    expect(urls).toEqual(['/RomanMurderParty/data/versions/abc.json']);
  });
  it('loadBook rejects invalid data', async () => {
    const stub = (async () => new Response('{"nope":1}', { status: 200 })) as unknown as typeof fetch;
    await expect(loadBook(stub, '', 'abc')).rejects.toThrow();
  });
  it('loadBook rejects HTTP errors', async () => {
    const stub = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(loadBook(stub, '', 'abc')).rejects.toThrow(/404/);
  });
});
