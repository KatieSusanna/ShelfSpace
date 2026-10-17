import { NextResponse } from 'next/server';

type OpenLibraryBook = {
  title?: string;
  authors?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  covers?: number[];
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const isbn = String(body?.isbn ?? '').replace(/[^0-9Xx]/g, '');

  if (!isbn) {
    return NextResponse.json({ error: 'Missing isbn' }, { status: 400 });
  }
  console.log('Looking up ISBN:', isbn);

  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const response = await fetch(url);

    if (!response.ok) {
        console.error('Google Books status:', response.status);
        return NextResponse.json({ error: 'Book lookup failed' }, { status: 502 });
    }

    const data: OpenLibraryBook = await response.json().catch(() => null);
    console.log('Open Library response:', data);

    return NextResponse.json({ isbn, data });
 } catch (err) {
  console.error('Lookup failed:', err, (err as Error & { cause?: unknown }).cause);
  return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
}
}
