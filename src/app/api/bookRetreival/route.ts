import { NextResponse } from 'next/server';
import { access, appendFile, writeFile } from 'fs/promises';
import path from 'path';

const csvPath = path.join(process.cwd(), 'books.csv');

type OpenLibraryBook = {
  title?: string;
  authors?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  covers?: number[];
};

type CsvRow = {
  isbn: string;
  title: string;
  authors: string;
  publishDate: string;
  pages: string;
  coverUrls: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const isbn = String(body?.isbn ?? '').replace(/[^0-9Xx]/g, '');

  if (!isbn) {
    return NextResponse.json({ error: 'Missing isbn' }, { status: 400 });
  }

  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Book lookup failed' }, { status: 502 });
    }

    const data = (await response.json()) as Record<string, OpenLibraryBook>;
    const book = data[`ISBN:${isbn}`];

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const coverUrls = (book.covers ?? [])
      .map((coverId) => `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`)
      .filter(Boolean);

    if (coverUrls.length === 0) {
      coverUrls.push(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);
    }

    await appendBookRow({
      isbn,
      title: book.title ?? '',
      authors: (book.authors ?? []).map((author) => author.name ?? '').filter(Boolean).join('; '),
      publishDate: book.publish_date ?? '',
      pages: book.number_of_pages?.toString() ?? '',
      coverUrls: coverUrls.join('; '),
    });

    return NextResponse.json({
      isbn,
      title: book.title ?? null,
      authors: (book.authors ?? []).map((author) => author.name).filter(Boolean),
      publishDate: book.publish_date ?? null,
      pages: book.number_of_pages ?? null,
      coverUrl: coverUrls[0] ?? null,
    });
  } catch (error) {
    console.error('Lookup failed:', error);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

async function appendBookRow(row: CsvRow) {
  const exists = await fileExists(csvPath);

  if (!exists) {
    await writeFile(csvPath, `${csvHeader()}\n`, 'utf8');
  }

  await appendFile(csvPath, `${serializeCsvRow(row)}\n`, 'utf8');
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function csvHeader() {
  return ['ISBN', 'Title', 'Authors', 'Publish Date', 'Number of Pages', 'Cover URLs'].join(',');
}

function serializeCsvRow(row: CsvRow) {
  return [row.isbn, row.title, row.authors, row.publishDate, row.pages, row.coverUrls]
    .map(escapeCsvValue)
    .join(',');
}

function escapeCsvValue(value: string) {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}



