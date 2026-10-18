import { NextResponse } from 'next/server';
import type { BookMetadata } from '@/lib/bookMetadata';

type OpenLibraryBook = {
  title?: string;
  authors?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  description?: string | { value?: string };
  covers?: number[];
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const isbn = String(body?.isbn ?? '').replace(/[^0-9Xx]/g, '');

  if (!/^97[89]\d{10}$/.test(isbn)) {
    return NextResponse.json({ error: 'A valid ISBN-13 is required.' }, { status: 400 });
  }

  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ error: 'Book lookup failed.' }, { status: 502 });

    const data = (await response.json()) as Record<string, OpenLibraryBook>;
    const book = data[`ISBN:${isbn}`];
    if (!book) return NextResponse.json({ error: 'No book data was found for this ISBN.' }, { status: 404 });

    const description = typeof book.description === 'string'
      ? book.description
      : book.description?.value ?? null;
    const metadata: BookMetadata = {
      isbn,
      title: book.title ?? '',
      authors: (book.authors ?? []).map((author) => author.name ?? '').filter(Boolean),
      publishDate: book.publish_date ?? null,
      pages: Number.isFinite(book.number_of_pages) ? book.number_of_pages ?? null : null,
      description,
      coverUrl: book.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-L.jpg`
        : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Book lookup failed:', error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
