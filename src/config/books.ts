import type { ShelfBook } from '@/lib/useBookSelection';
import { BOOKCASES } from '@/config/layout';

export const LEATHER_PALETTE = [
  '#6b1f24', '#2f4a35', '#4a2f1f', '#9a6b3f',
  '#243a5a', '#33302e', '#512a3a', '#55583a',
  '#31595b', '#493653', '#8a4e32', '#3c5266',
] as const;

const shelfRows = {
  tall: [0.11, 0.38, 0.66, 0.94, 1.22, 1.5].map((plankTop) => ({
    plankTop,
    usableWidth: 0.76,
    usableDepth: 0.17,
    spineFrontZ: 0.18,
    bookHeight: 0.24,
  })),
  // The compact frame has three real shelf boards at these heights.
  small: [0.1225, 0.4125, 0.7025].map((plankTop) => ({
    plankTop,
    usableWidth: 0.76,
    usableDepth: 0.17,
    spineFrontZ: 0.18,
    bookHeight: 0.21,
  })),
};

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

function placeOnBookcase(bookcase: (typeof BOOKCASES)[number], x: number, y: number, z: number): [number, number, number] {
  const [originX, originY, originZ] = bookcase.position;
  const scale = bookcase.scale;
  const yaw = bookcase.rotation[1];
  const scaledX = x * scale;
  const scaledZ = z * scale;
  return [
    originX + scaledX * Math.cos(yaw) + scaledZ * Math.sin(yaw),
    originY + y * scale,
    originZ - scaledX * Math.sin(yaw) + scaledZ * Math.cos(yaw),
  ];
}

export const SHELF_BOOKS: ShelfBook[] = (() => {
  const books: ShelfBook[] = [];
  let bookNumber = 0;

  BOOKCASES.forEach((bookcase, caseIndex) => {
    const rows = shelfRows[bookcase.kind];
    const scale = bookcase.scale;
    const yaw = bookcase.rotation[1];

    rows.forEach((row, rowIndex) => {
      const rowStart = bookNumber;
      const rowBooks = Array.from({ length: 7 }, (_, column) => {
        const id = `library-book-${rowStart + column + 1}`;
        const random = randomFromId(id);
        return { id, random, assetPiece: (rowStart + column) % 3, thickness: 0.092 + random() * 0.036 };
      });
      const gaps = rowBooks.slice(0, -1).map((book) => 0.004 + book.random() * 0.005);
      const gapWidth = gaps.reduce((sum, gap) => sum + gap, 0);
      const rawWidth = rowBooks.reduce((sum, book) => sum + book.thickness, 0);
      const thicknessScale = Math.min(1, (row.usableWidth - gapWidth) / rawWidth);
      const rowWidth = rawWidth * thicknessScale + gapWidth;
      let x = -Math.min(rowWidth, row.usableWidth) / 2;

      rowBooks.forEach((slot, column) => {
        const { id, random } = slot;
        const thickness = slot.thickness * thicknessScale;
        const height = row.bookHeight * (0.9 + random() * 0.2);
        const depth = Math.min(row.usableDepth, row.usableDepth * (0.82 + random() * 0.15));
        const paletteIndex = (bookNumber * 5 + rowIndex * 3 + caseIndex) % LEATHER_PALETTE.length;
        const brightness = 0.92 + random() * 0.16;
        const lean = random() > 0.68 ? (random() - 0.5) * 0.07 : 0;
        const localX = x + thickness / 2;
        books.push({
          id,
          title: '',
          author: '',
          description: '',
          assetPiece: slot.assetPiece,
          position: placeOnBookcase(bookcase, localX, row.plankTop + height / 2, row.spineFrontZ - depth / 2),
          rotationY: yaw,
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
  });

  return books;
})();
