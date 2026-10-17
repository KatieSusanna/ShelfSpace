import type { ShelfBook } from '@/lib/useBookSelection';
import { BOOKCASES } from '@/config/layout';

export const LEATHER_PALETTE = [
  '#6b1f24', '#2f4a35', '#4a2f1f', '#9a6b3f',
  '#243a5a', '#33302e', '#512a3a', '#55583a',
  '#31595b', '#493653', '#8a4e32', '#3c5266',
] as const;

// Heights, width and depth were read from the tall shelf and its old book-group bounds.
// The old books' bottom edges closely match these plank tops.
const SHELF_ROWS = [0.11, 0.38, 0.66, 0.94, 1.22, 1.5].map((plankTop) => ({
  plankTop,
  usableWidth: 0.76,
  usableDepth: 0.17,
  spineFrontZ: 0.18, // Flush with the front edge of the shelf so the spines stay visible.
}));
// Seven books per row gives the narrow shelf a fuller look while leaving a little breathing room.
const ROW_COUNTS = [7, 7, 7, 7, 7, 7];
const BOOKCASE = BOOKCASES.find((shelf) => shelf.kind === 'tall');
const MODEL_SCALE = typeof BOOKCASE?.scale === 'number' ? BOOKCASE.scale : 1;
const titles = [
  ['The Quiet Library', 'Moonlit Stories', 'The Old Map', 'Hidden Rooms', 'The Brass Key', 'Letters at Dawn', 'The Secret Stair'],
  ['A Winter Tale', 'The Glass Garden', 'Letters at Dusk', 'The Last Lantern', 'Winter Orchard', 'The Blue Hour', 'Frost and Fern'],
  ['Moss and Memory', 'The Clockmaker', 'A Fox in Snow', 'House of Echoes', 'The Green Door', 'Small Wonders', 'The Far Meadow'],
  ['The Amber Key', 'Beneath the Stairs', 'Northbound', 'The Night Archive', 'A Quiet Storm', 'The Lost Atlas', 'The Silver Thread'],
  ['Wildwood Songs', 'The Paper Moon', 'A Small Mystery', 'The Golden Hour', 'The Red Compass', 'Cloud Atlas', 'The Orchard Gate'],
];
const authors = ['E. Rowan', 'M. Vale', 'A. Finch', 'J. North', 'C. Wren'];

function randomFromId(id: string): () => number {
  let seed = 2166136261;
  for (const letter of id) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const SHELF_BOOKS: ShelfBook[] = (() => {
  if (!BOOKCASE) return [];
  const books: ShelfBook[] = [];
  const [shelfX, shelfY, shelfZ] = BOOKCASE.position;
  let bookNumber = 0;

  ROW_COUNTS.forEach((count, rowIndex) => {
    const shelfRow = SHELF_ROWS[rowIndex];
    if (!shelfRow) return;
    const rowBooks = Array.from({ length: count }, (_, column) => {
      const id = `library-book-${bookNumber + column + 1}`;
      const random = randomFromId(id);
      const assetPiece = (bookNumber + column) % 3;
      // These are substantially thicker than before, leaving a visible spine for its title.
      return { id, random, assetPiece, thickness: 0.092 + random() * 0.036 };
    });
    const gaps = rowBooks.slice(0, -1).map((book) => 0.004 + book.random() * 0.005);
    const gapWidth = gaps.reduce((sum, gap) => sum + gap, 0);
    const rawWidth = rowBooks.reduce((sum, book) => sum + book.thickness, 0);
    const thicknessScale = Math.min(1, Math.max(0.1, (shelfRow.usableWidth - gapWidth) / rawWidth));
    const rowWidth = rawWidth * thicknessScale + gapWidth;
    let x = -Math.min(rowWidth, shelfRow.usableWidth) / 2;

    rowBooks.forEach((slot, column) => {
      const { id, random } = slot;
      const thickness = slot.thickness * thicknessScale;
      const height = 0.24 * (0.9 + random() * 0.2);
      const depth = Math.min(shelfRow.usableDepth, 0.14 + random() * 0.02);
      const title = titles[rowIndex % titles.length][column];
      const paletteIndex = (bookNumber * 5 + rowIndex * 3) % LEATHER_PALETTE.length;
      const brightness = 0.92 + random() * 0.16;
      const lean = random() > 0.68 ? (random() - 0.5) * 0.07 : 0;
      const localX = x + thickness / 2;
      books.push({
        id,
        title,
        author: authors[(bookNumber + rowIndex) % authors.length],
        assetPiece: slot.assetPiece,
        position: [shelfX + localX * MODEL_SCALE, shelfY + (shelfRow.plankTop + height / 2) * MODEL_SCALE, shelfZ + (shelfRow.spineFrontZ - depth / 2) * MODEL_SCALE],
        height,
        depth,
        thickness,
        lean,
        leather: LEATHER_PALETTE[paletteIndex],
        roughness: 0.55 + random() * 0.3,
        brightness,
      });
      x += thickness + (gaps[column] ?? 0);
      bookNumber += 1;
    });
  });
  return books;
})();

