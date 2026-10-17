export type Obstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

// Dimensions are in metres. Keep the environment proportions here so the room,
// player bounds, and future scene assets can share one source of truth.
export const ROOM = {
  width: 12,
  depth: 12,
  height: 4,
  wallThickness: 0.2,
};

// The shell is intentionally empty; add asset transforms here when content arrives.
export const BOOKCASES: Array<{
  kind: 'tall' | 'small';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  width: number;
  depth: number;
}> = [];

export const OBSTACLES: Obstacle[] = [];

export function hitsObstacle(x: number, z: number, radius: number): boolean {
  return OBSTACLES.some((box) =>
    x + radius > box.minX &&
    x - radius < box.maxX &&
    z + radius > box.minZ &&
    z - radius < box.maxZ,
  );
}
