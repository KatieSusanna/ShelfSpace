export type Obstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export const ROOM = {
  width: 12,
  depth: 12,
  height: 4,
  wallThickness: 0.2,
};

export const BOOKCASES = [
  { kind: 'tall' as const, position: [-2.25, 0, -5.25] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: 1.12, width: 1.15, depth: 0.55 },
  { kind: 'small' as const, position: [1.55, 0, -5.25] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: 1, width: 1.15, depth: 1.0 },
];

// Derive collision footprints from the same positions used to draw the bookcases.
export const OBSTACLES: Obstacle[] = BOOKCASES.map((bookcase) => {
  const scaleX = typeof bookcase.scale === 'number' ? bookcase.scale : bookcase.scale[0];
  const scaleZ = typeof bookcase.scale === 'number' ? bookcase.scale : bookcase.scale[2];
  const halfWidth = (bookcase.width * scaleX) / 2;
  const halfDepth = (bookcase.depth * scaleZ) / 2;
  return {
    minX: bookcase.position[0] - halfWidth,
    maxX: bookcase.position[0] + halfWidth,
    minZ: bookcase.position[2] - halfDepth,
    maxZ: bookcase.position[2] + halfDepth,
  };
});

export function hitsObstacle(x: number, z: number, radius: number): boolean {
  return OBSTACLES.some((box) =>
    x + radius > box.minX &&
    x - radius < box.maxX &&
    z + radius > box.minZ &&
    z - radius < box.maxZ,
  );
}
