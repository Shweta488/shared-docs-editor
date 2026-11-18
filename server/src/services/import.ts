import { extname } from 'node:path';
import mammoth from 'mammoth';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { AppError } from '../errors.js';
import { sanitize } from './sanitize.js';

export const MAX_IMPORT_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB.
export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.docx'] as const;

const MAX_TITLE = 200;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Blank lines start a new paragraph; single newlines become line breaks.
function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function toHtml(ext: string, buffer: Buffer): Promise<string> {
  if (ext === '.txt') return textToHtml(buffer.toString('utf8'));
  if (ext === '.md') return marked.parse(buffer.toString('utf8'), { async: false });
  try {
    return (await mammoth.convertToHtml({ buffer })).value;
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Couldn’t read this .docx file. It may be damaged.');
  }
}

/**
 * Turns an uploaded file into a title and sanitized HTML for a new document.
 * Checked by extension, not MIME type, because browsers report .md inconsistently.
 */
export async function convertImport(
  originalName: string,
  buffer: Buffer,
): Promise<{ title: string; html: string }> {
  const ext = extname(originalName).toLowerCase();
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new AppError('UNSUPPORTED_FILE', 'That file type isn’t supported. Use .txt, .md, or .docx.');
  }

  // Anything outside the editor's formats (tables, links, images, code) is stripped
  // here, keeping its text where it has any. Same sanitizer as editor saves.
  const html = sanitize(await toHtml(ext, buffer));
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!text) throw new AppError('VALIDATION_ERROR', 'This file has no readable text.');

  const title = originalName.slice(0, -ext.length).trim().slice(0, MAX_TITLE) || 'Untitled document';
  return { title, html };
}
