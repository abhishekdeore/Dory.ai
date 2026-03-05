import type { PDFDocumentProxy } from 'pdfjs-dist';

// ~900 tokens × 4 chars/token = 3600 chars per chunk
// ~100 tokens × 4 chars/token = 400 chars overlap
const CHUNK_SIZE_CHARS = 3600;
const OVERLAP_CHARS = 400;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export interface PDFChunk {
  text: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface PDFParseResult {
  chunks: PDFChunk[];
  numPages: number;
  filename: string;
  charCount: number;
}

export class PDFService {
  static async parseAndChunk(buffer: Buffer, filename: string): Promise<PDFParseResult> {
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error('PDF exceeds 2MB size limit');
    }

    // Validate PDF magic bytes
    const header = buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid PDF file');
    }

    // Dynamically import the pdfjs-dist legacy build (ESM)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any;
    const uint8 = new Uint8Array(buffer);
    const doc: PDFDocumentProxy = await pdfjsLib.getDocument({
      data: uint8,
      // Suppress font warning in Node.js environment
      standardFontDataUrl: undefined,
    }).promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join(' ');
      if (pageText.trim()) pageTexts.push(pageText);
    }

    const data = { text: pageTexts.join('\n\n'), numpages: doc.numPages };

    // Normalize whitespace from PDF extraction
    const cleanText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    if (!cleanText || cleanText.length < 10) {
      throw new Error('No readable text content found in PDF. The file may be image-based or encrypted.');
    }

    const chunkTexts = PDFService.chunkText(cleanText);

    const chunks: PDFChunk[] = chunkTexts.map((text, i) => ({
      text,
      chunkIndex: i,
      totalChunks: chunkTexts.length,
    }));

    return {
      chunks,
      numPages: data.numpages,
      filename,
      charCount: cleanText.length,
    };
  }

  private static chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);

      // Try to break at a sentence or paragraph boundary to avoid mid-sentence cuts
      let breakPoint = end;
      if (end < text.length) {
        const searchWindow = text.slice(end - 200, end);
        const lastNewline = searchWindow.lastIndexOf('\n');
        const lastPeriod = searchWindow.lastIndexOf('. ');

        if (lastNewline > 100) {
          breakPoint = end - 200 + lastNewline + 1;
        } else if (lastPeriod > 100) {
          breakPoint = end - 200 + lastPeriod + 2;
        }
      }

      const chunk = text.slice(start, breakPoint).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      if (breakPoint >= text.length) break;
      start = breakPoint - OVERLAP_CHARS;
    }

    return chunks;
  }
}
