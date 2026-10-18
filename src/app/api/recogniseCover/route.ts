import { NextResponse } from 'next/server';
import type { BookMetadata } from '@/lib/bookMetadata';

export const runtime = 'nodejs';

type OpenLibraryBook = {
  title?: string;
  authors?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  description?: string | { value?: string };
  covers?: number[];
};

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  isbn?: string[];
  first_sentence?: string | string[];
};

type CoverIdentity = {
  title: string;
  authors: string[];
  isbn: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const image = String(body?.image ?? '');
  const imageMatch = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);

  if (!imageMatch || image.length > 8_000_000) {
    return NextResponse.json({ error: 'Send a JPEG, PNG, or WebP cover image under 6 MB.' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
  }

  try {
    const [, mimeType, imageData] = imageMatch;
    const identity = await identifyCover(imageData, mimeType, apiKey);
    if (!identity.title) {
      return NextResponse.json({ error: 'Gemini could not read a title. Try a sharper, well-lit photo of the front cover.' }, { status: 422 });
    }

    let searchDoc: OpenLibrarySearchDoc | null = null;
    let candidateIsbn = toIsbn13(identity.isbn);
    if (!candidateIsbn) {
      searchDoc = await findOpenLibraryMatch(identity);
      candidateIsbn = (searchDoc?.isbn ?? []).map(toIsbn13).find((value): value is string => Boolean(value)) ?? null;
    } else {
      // ISBN from the cover can identify the edition directly; title search is only supplementary.
      searchDoc = await findOpenLibraryMatch(identity).catch(() => null);
    }

    if (!candidateIsbn && !searchDoc) {
      return NextResponse.json({
        error: `Open Library could not find a record for “${identity.title}”. Try a clearer photo of the title and author.`,
      }, { status: 404 });
    }

    const openLibraryBook = candidateIsbn ? await getOpenLibraryBook(candidateIsbn) : null;
    if (!openLibraryBook && !searchDoc) {
      return NextResponse.json({ error: 'Open Library has no matching record for this cover.' }, { status: 404 });
    }

    const workDescription = searchDoc?.key
      ? await getWorkDescription(searchDoc.key).catch(() => null)
      : null;
    const coverId = openLibraryBook?.covers?.[0] ?? searchDoc?.cover_i;
    const coverUrl = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : candidateIsbn
        ? `https://covers.openlibrary.org/b/isbn/${candidateIsbn}-L.jpg?default=false`
        : null;
    const bookDescription = openLibraryBook?.description;
    const description = typeof bookDescription === 'string'
      ? bookDescription
      : bookDescription?.value ?? workDescription ?? sentenceText(searchDoc?.first_sentence) ?? null;

    const metadata: BookMetadata = {
      isbn: candidateIsbn,
      title: openLibraryBook?.title || searchDoc?.title || identity.title,
      authors: openLibraryBook?.authors?.map((author) => author.name ?? '').filter(Boolean)
        ?? searchDoc?.author_name
        ?? identity.authors,
      publishDate: openLibraryBook?.publish_date
        ?? (searchDoc?.first_publish_year ? String(searchDoc.first_publish_year) : null),
      pages: openLibraryBook?.number_of_pages ?? searchDoc?.number_of_pages_median ?? null,
      description,
      coverUrl,
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Cover recognition failed:', error);
    return NextResponse.json({ error: 'Could not recognise this cover. Please try again.' }, { status: 502 });
  }
}

async function identifyCover(imageData: string, mimeType: string, apiKey: string): Promise<CoverIdentity> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: 'Identify the book shown on the front cover. Transcribe only information visibly printed on the cover: the main title, author names, and ISBN only if an ISBN is clearly visible. Do not guess or invent missing details. If a field is not readable, use an empty string (or an empty authors array).',
          },
          { inline_data: { mime_type: mimeType, data: imageData } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            authors: { type: 'ARRAY', items: { type: 'STRING' } },
            isbn: { type: 'STRING' },
          },
          required: ['title', 'authors', 'isbn'],
        },
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error('Gemini request failed:', response.status, await response.text());
    throw new Error('Gemini could not process the image. Check the API key and try again.');
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('');
  if (typeof text !== 'string') throw new Error('Gemini returned no book details.');

  const parsed = JSON.parse(text) as Partial<CoverIdentity>;
  return {
    title: String(parsed.title ?? '').trim(),
    authors: Array.isArray(parsed.authors) ? parsed.authors.map(String).map((value) => value.trim()).filter(Boolean) : [],
    isbn: String(parsed.isbn ?? '').replace(/[^0-9Xx]/g, ''),
  };
}

async function findOpenLibraryMatch(identity: CoverIdentity): Promise<OpenLibrarySearchDoc | null> {
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('title', identity.title);
  if (identity.authors[0]) url.searchParams.set('author', identity.authors[0]);
  url.searchParams.set('fields', 'key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,first_sentence');
  url.searchParams.set('limit', '8');

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Open Library search failed.');
  const result = await response.json();
  const docs = (result?.docs ?? []) as OpenLibrarySearchDoc[];
  if (docs.length === 0) return null;

  return docs.sort((left, right) => matchScore(right, identity) - matchScore(left, identity))[0] ?? null;
}

function matchScore(book: OpenLibrarySearchDoc, identity: CoverIdentity) {
  const title = normalise(book.title ?? '');
  const wantedTitle = normalise(identity.title);
  let score = title === wantedTitle ? 100 : title.includes(wantedTitle) || wantedTitle.includes(title) ? 50 : 0;
  const wantedAuthors = identity.authors.map(normalise);
  if (book.author_name?.some((author) => wantedAuthors.includes(normalise(author)))) score += 20;
  return score;
}

function normalise(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function getOpenLibraryBook(isbn: string): Promise<OpenLibraryBook | null> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const result = await response.json() as Record<string, OpenLibraryBook>;
  return result[`ISBN:${isbn}`] ?? null;
}

async function getWorkDescription(workKey: string): Promise<string | null> {
  if (!/^\/works\/OL\d+W$/.test(workKey)) return null;
  const response = await fetch(`https://openlibrary.org${workKey}.json`, { cache: 'no-store' });
  if (!response.ok) return null;
  const work = await response.json();
  const description = work?.description;
  return typeof description === 'string' ? description : description?.value ?? null;
}

function sentenceText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(' ') || null : value ?? null;
}

function toIsbn13(value: string): string | null {
  const compact = value.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (isValidIsbn13(compact)) return compact;
  if (!/^\d{9}[\dX]$/.test(compact)) return null;

  const isbn10Sum = compact.slice(0, 9).split('').reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0)
    + (compact[9] === 'X' ? 10 : Number(compact[9]));
  if (isbn10Sum % 11 !== 0) return null;

  const firstTwelve = `978${compact.slice(0, 9)}`;
  const checksumSum = firstTwelve.split('').reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return `${firstTwelve}${(10 - checksumSum % 10) % 10}`;
}

function isValidIsbn13(value: string) {
  if (!/^97[89]\d{10}$/.test(value)) return false;
  const sum = value.slice(0, 12).split('').reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === Number(value[12]);
}
