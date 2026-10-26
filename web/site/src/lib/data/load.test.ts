import { describe, expect, it } from 'vitest';
import { loadBible, loadBook, loadSiteInfo } from './load';

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

describe('loadSiteInfo', () => {
  it('requests site.json under base and validates it', async () => {
    const urls: string[] = [];
    const stub = (async (url: string) => {
      urls.push(url);
      return new Response('{"schemaVersion":1,"presentation":null,"bible":true}', { status: 200 });
    }) as unknown as typeof fetch;
    expect(await loadSiteInfo(stub, '/RomanMurderParty')).toEqual({ schemaVersion: 1, presentation: null, bible: true });
    expect(urls).toEqual(['/RomanMurderParty/data/site.json']);
  });
  it('rejects invalid data', async () => {
    const stub = (async () => new Response('{"bible":"oui"}', { status: 200 })) as unknown as typeof fetch;
    await expect(loadSiteInfo(stub, '')).rejects.toThrow();
  });
});

describe('loadBible', () => {
  it('requests bible.json under base', async () => {
    const urls: string[] = [];
    const stub = (async (url: string) => {
      urls.push(url);
      return new Response('{"schemaVersion":1,"files":[]}', { status: 200 });
    }) as unknown as typeof fetch;
    expect(await loadBible(stub, '/RomanMurderParty')).toEqual({ schemaVersion: 1, files: [] });
    expect(urls).toEqual(['/RomanMurderParty/data/bible.json']);
  });
  it('gives null when there is no bible', async () => {
    const stub = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    expect(await loadBible(stub, '')).toBeNull();
  });
  it('rejects other HTTP errors', async () => {
    const stub = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    await expect(loadBible(stub, '')).rejects.toThrow(/500/);
  });
});
