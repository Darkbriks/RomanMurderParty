import type { PDFDocumentProxy } from 'pdfjs-dist';
// Only the URL of the worker file (under the base path): nothing is fetched until a PDF is opened.
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

/**
 * Opens a PDF with pdf.js. The library is imported here and nowhere else, so it is a chunk of its
 * own, fetched the first time book pages are shown, never with the reader's other modes. The
 * legacy build is used: the modern one relies on very recent built-ins (Map.getOrInsertComputed)
 * that many readers' browsers lack. Nothing is fetched from elsewhere: no CMaps, standard fonts
 * or WebAssembly decoders are configured (the novel's PDF embeds its fonts).
 */
export async function loadPdf(url: string): Promise<PDFDocumentProxy> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs.getDocument({ url, useWasm: false, enableXfa: false }).promise;
}
