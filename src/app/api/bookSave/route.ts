import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { BookMetadata } from '@/lib/bookMetadata';

export const runtime = 'nodejs';

const csvPath = path.join(process.cwd(), 'books.csv');
const header = ['Book ID', 'ISBN', 'Title', 'Authors', 'Publish Date', 'Number of Pages', 'Cover URLs', 'Description'];

type SavedBook = BookMetadata & { bookId: string };

export async function GET(request: Request) {
  const bookId = new URL(request.url).searchParams.get('bookId');

  try {
    const books = await readSavedBooks();
    if (!bookId) return NextResponse.json(books.filter((book) => book.bookId));
    const saved = books.find((book) => book.bookId === bookId);
    if (!saved) return NextResponse.json({ error: 'No saved scan for this book.' }, { status: 404 });
    const { bookId: _bookId, ...metadata } = saved;
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Could not read saved book data:', error);
    return NextResponse.json({ error: 'Could not read saved book data.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const bookId = String(body?.bookId ?? '').trim();
  const incoming = body?.metadata as Partial<BookMetadata> | undefined;
  const isbn = String(incoming?.isbn ?? '').replace(/[^0-9Xx]/g, '');
  if (!bookId || !incoming || !/^97[89]\d{10}$/.test(isbn) || !String(incoming.title ?? '').trim()) {
    return NextResponse.json({ error: 'Book ID and complete scanned book data are required.' }, { status: 400 });
  }

  const savedBook: SavedBook = {
    bookId,
    isbn,
    title: String(incoming.title).trim(),
    authors: Array.isArray(incoming.authors) ? incoming.authors.map(String).filter(Boolean) : [],
    publishDate: nullableString(incoming.publishDate),
    pages: Number.isFinite(incoming.pages) ? Number(incoming.pages) : null,
    description: nullableString(incoming.description),
    coverUrl: nullableString(incoming.coverUrl),
  };

  try {
    const books = await readSavedBooks();
    const existingIndex = books.findIndex((book) => book.bookId === bookId);
    if (existingIndex === -1) books.push(savedBook);
    else books[existingIndex] = savedBook;
    await writeFile(csvPath, serializeBooks(books), 'utf8');
    return NextResponse.json({ saved: true, bookId });
  } catch (error) {
    console.error('Could not save scanned book data:', error);
    return NextResponse.json({ error: 'Could not save scanned book data.' }, { status: 500 });
  }
}

async function readSavedBooks(): Promise<SavedBook[]> {
  let source: string;
  try {
    source = await readFile(csvPath, 'utf8');
  } catch {
    return [];
  }

  const rows = parseCsv(source);
  if (rows.length === 0) return [];

  const firstCell = rows[0][0]?.trim().toLowerCase();
  if (firstCell === 'book id') {
    const indexes = Object.fromEntries(rows[0].map((name, index) => [name.trim().toLowerCase(), index]));
    return rows.slice(1).filter((row) => row.some(Boolean)).map((row) => rowToBook(row, indexes));
  }
  if (firstCell === 'isbn') {
    const indexes = Object.fromEntries(rows[0].map((name, index) => [name.trim().toLowerCase(), index]));
    return rows.slice(1).filter((row) => row.some(Boolean)).map((row) => rowToBook(row, indexes));
  }

  // Keep legacy ISBN rows while adding an empty book ID so new scans can be linked safely.
  return rows.filter((row) => row.some(Boolean)).map((row) => ({
    bookId: '',
    isbn: row[0] ?? '',
    title: row[1] ?? '',
    authors: splitAuthors(row[2] ?? ''),
    publishDate: nullableString(row[3]),
    pages: parsePages(row[4]),
    coverUrl: firstCover(row[5]),
    description: null,
  }));
}

function rowToBook(row: string[], indexes: Record<string, number>): SavedBook {
  const get = (...names: string[]) => {
    const index = names.map((name) => indexes[name]).find((value) => value !== undefined);
    return index === undefined ? '' : row[index] ?? '';
  };
  return {
    bookId: get('book id'),
    isbn: get('isbn'),
    title: get('title'),
    authors: splitAuthors(get('authors', 'author')),
    publishDate: nullableString(get('publish date', 'publishdate')),
    pages: parsePages(get('number of pages', 'pages')),
    coverUrl: firstCover(get('cover urls', 'coverurl', 'cover url')),
    description: nullableString(get('description')),
  };
}

function serializeBooks(books: SavedBook[]) {
  const rows = [header, ...books.map((book) => [
    book.bookId,
    book.isbn,
    book.title,
    book.authors.join('; '),
    book.publishDate ?? '',
    book.pages?.toString() ?? '',
    book.coverUrl ?? '',
    book.description ?? '',
  ])];
  return `${rows.map((row) => row.map(escapeCsv).join(',')).join('\n')}\n`;
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"' && cell.length === 0) quoted = true;
    else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function escapeCsv(value: string) {
  return /[,"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function nullableString(value: unknown): string | null {
  const result = String(value ?? '').trim();
  return result || null;
}

function parsePages(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function splitAuthors(value: string) {
  return value.split(';').map((author) => author.trim()).filter(Boolean);
}

function firstCover(value: string) {
  return value.split(';').map((cover) => cover.trim()).find(Boolean) ?? null;
}
