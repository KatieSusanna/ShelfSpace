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

const titles = [
  ['The Quiet Library', 'Moonlit Stories', 'The Old Map', 'Hidden Rooms', 'The Brass Key', 'Letters at Dawn', 'The Secret Stair'],
  ['A Winter Tale', 'The Glass Garden', 'Letters at Dusk', 'The Last Lantern', 'Winter Orchard', 'The Blue Hour', 'Frost and Fern'],
  ['Moss and Memory', 'The Clockmaker', 'A Fox in Snow', 'House of Echoes', 'The Green Door', 'Small Wonders', 'The Far Meadow'],
  ['The Amber Key', 'Beneath the Stairs', 'Northbound', 'The Night Archive', 'A Quiet Storm', 'The Lost Atlas', 'The Silver Thread'],
  ['Wildwood Songs', 'The Paper Moon', 'A Small Mystery', 'The Golden Hour', 'The Red Compass', 'Cloud Atlas', 'The Orchard Gate'],
];
const authors = ['E. Rowan', 'M. Vale', 'A. Finch', 'J. North', 'C. Wren'];

const descriptionOpenings = [
  (title: string) => `${title} begins when a weathered letter reveals a secret hidden in an old library.`,
  (title: string) => `In ${title}, a quiet village is unsettled by a map with one place crossed out.`,
  (title: string) => `${title} follows an apprentice who discovers that the town clock has stopped for a reason.`,
  (title: string) => `A forgotten key sets the mystery in motion in ${title}.`,
  (title: string) => `${title} tells of two neighbours brought together by a parcel delivered to the wrong door.`,
  (title: string) => `In ${title}, a long-lost notebook leads its finder onto a winding country path.`,
  (title: string) => `${title} opens on the eve of a festival, when an unexpected visitor changes everything.`,
  (title: string) => `A curious child and a cautious fox share an unlikely adventure in ${title}.`,
  (title: string) => `${title} centres on a small bookshop where every visitor seems to know the same old song.`,
  (title: string) => `When a distant lighthouse flashes out of season, the characters in ${title} begin asking questions.`,
  (title: string) => `${title} follows a family returning to a house full of unopened letters and old memories.`,
  (title: string) => `An odd entry in a village diary starts a chain of discoveries in ${title}.`,
  (title: string) => `In ${title}, a gardener finds a silver thread caught among the roots of an ancient tree.`,
  (title: string) => `${title} begins with a train arriving at a station that does not appear on any timetable.`,
  (title: string) => `A missing portrait draws a young historian into the heart of ${title}.`,
  (title: string) => `${title} follows a musician searching for the source of a melody heard only at night.`,
  (title: string) => `The discovery of a sealed room gives ${title} its first clue and its greatest question.`,
];

const descriptionTurns = [
  'Each clue brings the friends closer, while revealing how much they still have to learn about one another.',
  'Through snowy lanes and warm kitchens, the search becomes a story about courage and belonging.',
  'A gentle mystery unfolds, with unexpected allies appearing just when they are needed.',
  'The journey tests old loyalties and shows that the truth can be kinder than a rumour.',
  'Small acts of kindness help uncover a much larger story buried in the past.',
  'As the seasons turn, the search becomes a chance to mend a friendship and begin again.',
  'The answer lies closer to home than anyone expects, tucked among familiar places.',
  'With humour, heart, and a little bit of magic, the characters learn to trust their instincts.',
  'Every new discovery brings a fresh puzzle, and every puzzle opens another door.',
  'The story weaves family secrets and new beginnings into an adventure full of warmth.',
  'A race against time leads from the village square to the wild edge of the forest.',
  'By listening to the people around them, the characters find a solution no map could show.',
  'What starts as a simple errand grows into a memorable journey across the countryside.',
  'The mystery is full of false starts, unlikely friendships, and one very surprising witness.',
  'In the end, the most important thing they uncover is a reason to come together.',
  'Quietly magical and full of detail, the tale rewards anyone willing to look twice.',
  'An old promise shapes the adventure, but the next chapter belongs to the people living it now.',
  'The path ahead is uncertain, yet each step makes the once-strange place feel like home.',
  'A hopeful, cosy story about finding your way when the familiar world changes.',
];

function makeDescription(title: string, bookIndex: number): string {
  const opening = descriptionOpenings[bookIndex % descriptionOpenings.length](title);
  const turnIndex = Math.floor(bookIndex / descriptionOpenings.length) % descriptionTurns.length;
  return `${opening} ${descriptionTurns[turnIndex]}`;
}

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
        const title = titles[rowIndex % titles.length][column] ?? 'Stories from the Stacks';
        const paletteIndex = (bookNumber * 5 + rowIndex * 3 + caseIndex) % LEATHER_PALETTE.length;
        const brightness = 0.92 + random() * 0.16;
        const lean = random() > 0.68 ? (random() - 0.5) * 0.07 : 0;
        const localX = x + thickness / 2;
        books.push({
          id,
          title,
          author: authors[(bookNumber + rowIndex) % authors.length],
          description: makeDescription(title, bookNumber),
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
