export type Obstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export const ROOM = {
  width: 10,
  depth: 10,
  height: 3.2,
  wallThickness: 0.2,
  doorWidth: 1.6,
  doorHeight: 2.25,
  windowWidth: 1.3,
  windowHeight: 2.2,
  windowBottom: 0.55,
  windowCenterZ: -1.0,
};

type BookcaseLayout = {
  kind: 'tall' | 'small';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  width: number;
  depth: number;
};

const TALL_SCALE = 1.12;
const TALL_WIDTH = 0.97 * TALL_SCALE;
const TALL_DEPTH = 0.357 * TALL_SCALE;
const tallCase = (x: number, z: number, yaw: number): BookcaseLayout => ({
  kind: 'tall',
  position: [x, 0, z],
  rotation: [0, yaw, 0],
  scale: TALL_SCALE,
  width: 0.97,
  depth: 0.357,
});

const SMALL_WIDTH = 0.97;
const SMALL_DEPTH = 0.357;
const lowCase = (x: number, z: number, yaw: number): BookcaseLayout => ({
  kind: 'small',
  position: [x, 0, z],
  rotation: [0, yaw, 0],
  scale: 1,
  width: SMALL_WIDTH,
  depth: SMALL_DEPTH,
});
const beanbagFacingSmallShelves = [-1, 1].flatMap((side) =>
  [-2.45, -1.15].map((z) => lowCase(side * 2.15, z, side === -1 ? Math.PI / 2 : -Math.PI / 2)),
);

const DOOR_SIDE_SHELF_COUNT = 3;
const LEFT_WALL_SHELF_COUNT = 8;
const doorWallShelves = [-1, 1].flatMap((side) =>
  Array.from({ length: DOOR_SIDE_SHELF_COUNT }, (_, index) => {
    const x = side * (ROOM.doorWidth / 2 + TALL_WIDTH / 2 + index * TALL_WIDTH);
    const z = ROOM.depth / 2 - ROOM.wallThickness / 2 - TALL_DEPTH / 2;
    return tallCase(x, z, Math.PI);
  }),
);
const leftWallShelves = Array.from({ length: LEFT_WALL_SHELF_COUNT }, (_, index) => {
  const x = -ROOM.width / 2 + ROOM.wallThickness / 2 + TALL_DEPTH / 2;
  const z = (index - (LEFT_WALL_SHELF_COUNT - 1) / 2) * TALL_WIDTH;
  return tallCase(x, z, Math.PI / 2);
});

// North is -Z. The tall shelves touch along the left wall and flank the entrance.
// Smaller shelves remain beside the fireplace, with the existing east wall shelves.
export const BOOKCASES: BookcaseLayout[] = [
  ...beanbagFacingSmallShelves,
  ...leftWallShelves,
  ...[2.35, 3.55].map((z) => tallCase(4.7, z, -Math.PI / 2)),
  ...doorWallShelves,
];

// Candle tables sit farther in from the perimeter shelves to leave a broad aisle.
export const CANDLE_TABLES = [
  [-2.85, -3.3],
  [2.85, -3.3],
  [-2.85, 3.3],
  [2.85, 3.3],
] as const;

// Three balanced pairs of tall bookcases receive grouped candles on their measured top surface.
export const BOOKCASE_CANDLE_INDICES = [5, 10, 12, 13, 16, 19];

// The fireplace FBX is authored in centimetres and faces along local +X.
export const FIREPLACE = {
  position: [0, 0.009, -4.488] as [number, number, number],
  rotation: [0, -Math.PI / 2, 0] as [number, number, number],
  scale: 0.011,
  width: 1.518,
  depth: 0.906,
};

export const FIREPLACE_WINDOWS = {
  width: 1.3,
  height: 2.2,
  bottom: 0.55,
  centersX: [-2.35, 2.35] as const,
};

export const WINDOW_SEAT = {
  position: [4.32, 0.25, 0.85] as [number, number, number],
  size: [0.66, 0.5, 1.6] as [number, number, number],
};

export const LOUNGE_SEATS = [
  [-0.72, -2.15],
  [0.72, -2.15],
  [0, -0.95],
] as const;

function getFootprint(layout: BookcaseLayout): Obstacle {
  const [x, , z] = layout.position;
  const halfWidth = (layout.width * layout.scale) / 2;
  const halfDepth = (layout.depth * layout.scale) / 2;
  const yaw = layout.rotation[1];
  const halfX = Math.abs(Math.cos(yaw)) * halfWidth + Math.abs(Math.sin(yaw)) * halfDepth;
  const halfZ = Math.abs(Math.sin(yaw)) * halfWidth + Math.abs(Math.cos(yaw)) * halfDepth;
  return { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
}

const fireplaceFootprint: Obstacle = {
  minX: FIREPLACE.position[0] - FIREPLACE.width / 2,
  maxX: FIREPLACE.position[0] + FIREPLACE.width / 2,
  minZ: FIREPLACE.position[2] - FIREPLACE.depth / 2,
  maxZ: FIREPLACE.position[2] + FIREPLACE.depth / 2,
};

export const OBSTACLES: Obstacle[] = [...BOOKCASES.map(getFootprint), fireplaceFootprint];
// Keep the player from walking through the four candle-table pedestals.
for (const [x, z] of CANDLE_TABLES) {
  OBSTACLES.push({ minX: x - 0.43, maxX: x + 0.43, minZ: z - 0.43, maxZ: z + 0.43 });
}
OBSTACLES.push({
  minX: WINDOW_SEAT.position[0] - WINDOW_SEAT.size[0] / 2,
  maxX: WINDOW_SEAT.position[0] + WINDOW_SEAT.size[0] / 2,
  minZ: WINDOW_SEAT.position[2] - WINDOW_SEAT.size[2] / 2,
  maxZ: WINDOW_SEAT.position[2] + WINDOW_SEAT.size[2] / 2,
});
for (const [x, z] of LOUNGE_SEATS) {
  OBSTACLES.push({ minX: x - 0.42, maxX: x + 0.42, minZ: z - 0.42, maxZ: z + 0.42 });
}

export function hitsObstacle(x: number, z: number, radius: number): boolean {
  return OBSTACLES.some((box) =>
    x + radius > box.minX &&
    x - radius < box.maxX &&
    z + radius > box.minZ &&
    z - radius < box.maxZ,
  );
}



