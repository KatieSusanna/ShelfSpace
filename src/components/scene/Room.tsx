'use client';

import { Fragment, Suspense, useEffect, useMemo } from 'react';
import { DoubleSide, ExtrudeGeometry, NoColorSpace, RepeatWrapping, Shape, SRGBColorSpace, Vector2 } from 'three';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { BOOKCASES, BOOKCASE_CANDLE_INDICES, FIREPLACE_WINDOWS, ROOM, WINDOW_SEAT } from '@/config/layout';
import { Bookcase } from '@/components/Bookcase';
import { Lighting } from './Lighting';
import { Dust } from './Dust';
import { BookShelf } from './Book';
import { SHELF_BOOKS } from '@/config/books';
import { BookSelectionController } from './BookSelectionController';
import type { ShelfBook } from '@/lib/useBookSelection';
import { Fireplace } from './Fireplace';
import { Beanbags } from './Beanbags';
import { Carpet } from './Carpet';
import { GothicWindow6 } from './GothicWindow6';
import { CandleTables } from './CandleTables';

const WALL_BASE_COLOR = '#73543a';

function WoodPlankMaterial({ width, height }: { width: number; height: number }) {
  const [baseColorSource, normalSource, packedSource] = useTexture([
    '/textures/wooden-planks/T_vjisagn_2K_B.png',
    '/textures/wooden-planks/T_vjisagn_2K_N.png',
    '/textures/wooden-planks/T_vjisagn_2K_ORM.png',
  ]);
  const [baseColor, normalMap, packedMap] = useMemo(() => {
    const maps = [baseColorSource.clone(), normalSource.clone(), packedSource.clone()];
    for (const map of maps) {
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      // The source texture covers 2 m horizontally by 1 m vertically.
      map.repeat.set(width / 2, height);
      map.needsUpdate = true;
    }
    maps[0].colorSpace = SRGBColorSpace;
    maps[1].colorSpace = NoColorSpace;
    maps[2].colorSpace = NoColorSpace;
    return maps;
  }, [baseColorSource, normalSource, packedSource, width, height]);

  return (
    <meshStandardMaterial
      map={baseColor}
      normalMap={normalMap}
      roughnessMap={packedMap}
      roughness={0.88}
      metalness={0}
      normalScale={new Vector2(0.35, 0.35)}
      side={DoubleSide}
    />
  );
}

function Doorway() {
  const sideWidth = (ROOM.width - ROOM.doorWidth) / 2;
  const sideX = ROOM.doorWidth / 2 + sideWidth / 2;
  const z = ROOM.depth / 2 - ROOM.wallThickness / 2;
  const wood = '#40271c';
  const trim = '#765334';
  return (
    <>
      {[-sideX, sideX].map((x) => (
        <mesh key={x} position={[x, ROOM.height / 2, ROOM.depth / 2]}>
          <boxGeometry args={[sideWidth, ROOM.height, ROOM.wallThickness]} />
          <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.94} />
        </mesh>
      ))}
      <mesh position={[0, (ROOM.height + ROOM.doorHeight) / 2, ROOM.depth / 2]}>
        <boxGeometry args={[ROOM.doorWidth, ROOM.height - ROOM.doorHeight, ROOM.wallThickness]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.94} />
      </mesh>
      <mesh position={[0, ROOM.doorHeight / 2, z]}>
        <boxGeometry args={[ROOM.doorWidth - 0.12, ROOM.doorHeight - 0.08, 0.08]} />
        <meshStandardMaterial color={wood} roughness={0.78} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * ROOM.doorWidth / 2, ROOM.doorHeight / 2, z - 0.045]}>
          <boxGeometry args={[0.09, ROOM.doorHeight + 0.08, 0.12]} />
          <meshStandardMaterial color={trim} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, ROOM.doorHeight + 0.04, z - 0.045]}>
        <boxGeometry args={[ROOM.doorWidth + 0.09, 0.09, 0.12]} />
        <meshStandardMaterial color={trim} roughness={0.75} />
      </mesh>
      <mesh position={[0.52, 1.05, z - 0.08]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#c3974c" metalness={0.65} roughness={0.32} />
      </mesh>
    </>
  );
}

function EastWindow() {
  const centerZ = ROOM.windowCenterZ;
  const width = ROOM.windowWidth;
  const height = ROOM.windowHeight;
  const bottom = ROOM.windowBottom;
  const top = bottom + height;
  const wallX = ROOM.width / 2;
  const windowStart = centerZ - width / 2;
  const windowEnd = centerZ + width / 2;
  const leftDepth = windowStart + ROOM.depth / 2;
  const rightDepth = ROOM.depth / 2 - windowEnd;
  const sideSegments = [
    { depth: leftDepth, z: (-ROOM.depth / 2 + windowStart) / 2 },
    { depth: rightDepth, z: (windowEnd + ROOM.depth / 2) / 2 },
  ];
  return (
    <>
      <mesh position={[wallX, bottom / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, bottom, ROOM.depth]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.94} />
      </mesh>
      <mesh position={[wallX, (ROOM.height + top) / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, ROOM.height - top, ROOM.depth]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.94} />
      </mesh>
      {sideSegments.map(({ depth, z }) => (
        <mesh key={z} position={[wallX, (bottom + top) / 2, z]}>
          <boxGeometry args={[ROOM.wallThickness, height, depth]} />
          <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.94} />
        </mesh>
      ))}
      <Suspense fallback={null}>
        <GothicWindow6 position={[wallX - 0.04, bottom, centerZ]} rotation={[0, -Math.PI / 2, 0]} width={width} height={height} />
      </Suspense>
    </>
  );
}

function WindowArchCap({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  material,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  material: THREE.Material;
}) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-width / 2, height * 0.68);
    shape.quadraticCurveTo(-width / 2, height * 0.88, 0, height);
    shape.quadraticCurveTo(width / 2, height * 0.88, width / 2, height * 0.68);
    shape.lineTo(width / 2, height);
    shape.lineTo(-width / 2, height);
    shape.closePath();
    return new ExtrudeGeometry(shape, {
      depth: ROOM.wallThickness,
      bevelEnabled: false,
      steps: 1,
    });
  }, [height, width]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
    />
  );
}

function FireplaceWall() {
  const { width, height, bottom, centersX } = FIREPLACE_WINDOWS;
  const wallZ = -ROOM.depth / 2;
  const leftEdges = centersX.map((center) => center - width / 2);
  const rightEdges = centersX.map((center) => center + width / 2);
  const spans = [
    [-ROOM.width / 2, leftEdges[0]],
    [rightEdges[0], leftEdges[1]],
    [rightEdges[1], ROOM.width / 2],
  ];
  const material = <meshStandardMaterial color={WALL_BASE_COLOR} roughness={0.94} />;
  return (
    <>
      {spans.map(([start, end], index) => (
        <mesh key={`span-${index}`} position={[(start + end) / 2, ROOM.height / 2, wallZ]}>
          <boxGeometry args={[end - start, ROOM.height, ROOM.wallThickness]} />
          {material}
        </mesh>
      ))}
      {centersX.map((center) => (
        <Fragment key={center}>
          <mesh position={[center, bottom / 2, wallZ]}>
            <boxGeometry args={[width, bottom, ROOM.wallThickness]} />
            {material}
          </mesh>
          <mesh position={[center, (bottom + height + ROOM.height) / 2, wallZ]}>
            <boxGeometry args={[width, ROOM.height - bottom - height, ROOM.wallThickness]} />
            {material}
          </mesh>
          <Suspense fallback={null}>
            <GothicWindow6 position={[center, bottom, wallZ + ROOM.wallThickness / 2 + 0.015]} width={width} height={height} />
          </Suspense>
        </Fragment>
      ))}
    </>
  );
}

function LoungeAndWindowSeat() {
  return (
    <>
      <Suspense fallback={null}><Carpet /></Suspense>
      <Beanbags />
      <mesh position={[WINDOW_SEAT.position[0], 0.21, WINDOW_SEAT.position[2]]} castShadow receiveShadow>
        <boxGeometry args={[WINDOW_SEAT.size[0], 0.42, WINDOW_SEAT.size[2]]} />
        <meshStandardMaterial color="#543724" roughness={0.82} />
      </mesh>
      <mesh position={[WINDOW_SEAT.position[0], 0.49, WINDOW_SEAT.position[2]]} castShadow receiveShadow>
        <boxGeometry args={[WINDOW_SEAT.size[0] + 0.04, 0.14, WINDOW_SEAT.size[2] + 0.04]} />
        <meshStandardMaterial color="#70402f" roughness={0.94} />
      </mesh>
      <group position={[0, 0, -1.8]}>
        <mesh position={[0, 2.86, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.62, 8]} />
          <meshStandardMaterial color="#725334" metalness={0.55} roughness={0.55} />
        </mesh>
        <mesh position={[0, 2.48, 0]}>
          <sphereGeometry args={[0.13, 14, 12]} />
          <meshStandardMaterial color="#ffd18a" emissive="#ff9f43" emissiveIntensity={2.2} roughness={0.4} />
        </mesh>
        <pointLight position={[0, 2.42, 0]} color="#ffca82" intensity={7} distance={7} decay={2} />
      </group>
    </>
  );
}

function TexturedFloor() {
  const [colorMap, normalMap, roughnessMap] = useTexture([
    '/models/floor/optimized/WoodFloor070_Color_2K.jpg',
    '/models/floor/optimized/WoodFloor070_NormalGL_2K.jpg',
    '/models/floor/optimized/WoodFloor070_Roughness_2K.jpg',
  ]);

  useEffect(() => {
    for (const texture of [colorMap, normalMap, roughnessMap]) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(4, 4);
      texture.needsUpdate = true;
    }
    colorMap.colorSpace = SRGBColorSpace;
  }, [colorMap, normalMap, roughnessMap]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
      <planeGeometry args={[ROOM.width, ROOM.depth]} />
      <meshStandardMaterial map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} roughness={0.9} normalScale={new Vector2(0.3, 0.3)} />
    </mesh>
  );
}

type WallFaceDefinition = {
  key: string;
  width: number;
  height: number;
  position: [number, number, number];
  rotation: [number, number, number];
};

function WallFace({ definition, material }: { definition: WallFaceDefinition; material: THREE.Material }) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(definition.width, definition.height);
    const uv = plane.getAttribute('uv');
    for (let index = 0; index < uv.count; index += 1) {
      // The square brick tile repeats once per metre in both wall directions.
      uv.setXY(index, uv.getX(index) * definition.width, uv.getY(index) * definition.height);
    }
    uv.needsUpdate = true;
    plane.setAttribute('uv2', uv.clone());
    return plane;
  }, [definition.height, definition.width]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} material={material} position={definition.position} rotation={definition.rotation} receiveShadow />;
}

function WallFinish() {
  const [colorSource, normalSource, roughnessSource, aoSource] = useTexture([
    '/textures/room-walls/grey-bricks/Bricks063_1K-JPG_Color.jpg',
    '/textures/room-walls/grey-bricks/Bricks063_1K-JPG_NormalGL.jpg',
    '/textures/room-walls/grey-bricks/Bricks063_1K-JPG_Roughness.jpg',
    '/textures/room-walls/grey-bricks/Bricks063_1K-JPG_AmbientOcclusion.jpg',
  ]);
  const [colorMap, normalMap, roughnessMap, aoMap] = useMemo(() => {
    const maps = [colorSource.clone(), normalSource.clone(), roughnessSource.clone(), aoSource.clone()];
    for (const texture of maps) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.needsUpdate = true;
    }
    maps[0].colorSpace = SRGBColorSpace;
    maps[1].colorSpace = NoColorSpace;
    maps[2].colorSpace = NoColorSpace;
    maps[3].colorSpace = NoColorSpace;
    return maps;
  }, [aoSource, colorSource, normalSource, roughnessSource]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    roughnessMap,
    aoMap,
    aoMapIntensity: 0.7,
    roughness: 0.94,
    metalness: 0,
    normalScale: new Vector2(0.2, 0.2),
    side: DoubleSide,
  }), [aoMap, colorMap, normalMap, roughnessMap]);
  useEffect(() => () => {
    material.dispose();
    colorMap.dispose();
    normalMap.dispose();
    roughnessMap.dispose();
    aoMap.dispose();
  }, [aoMap, colorMap, material, normalMap, roughnessMap]);

  const westX = -ROOM.width / 2 + ROOM.wallThickness / 2 + 0.004;
  const eastX = ROOM.width / 2 - ROOM.wallThickness / 2 - 0.004;
  const northZ = -ROOM.depth / 2 + ROOM.wallThickness / 2 + 0.004;
  const southZ = ROOM.depth / 2 - ROOM.wallThickness / 2 - 0.004;
  const eastStart = ROOM.windowCenterZ - ROOM.windowWidth / 2;
  const eastEnd = ROOM.windowCenterZ + ROOM.windowWidth / 2;
  const eastTop = ROOM.windowBottom + ROOM.windowHeight;
  const eastSides = [
    { width: eastStart + ROOM.depth / 2, z: (-ROOM.depth / 2 + eastStart) / 2 },
    { width: ROOM.depth / 2 - eastEnd, z: (eastEnd + ROOM.depth / 2) / 2 },
  ];
  const windowWidth = FIREPLACE_WINDOWS.width;
  const northTop = FIREPLACE_WINDOWS.bottom + FIREPLACE_WINDOWS.height;
  const leftEdges = FIREPLACE_WINDOWS.centersX.map((center) => center - windowWidth / 2);
  const rightEdges = FIREPLACE_WINDOWS.centersX.map((center) => center + windowWidth / 2);
  const northSpans = [
    [-ROOM.width / 2, leftEdges[0]],
    [rightEdges[0], leftEdges[1]],
    [rightEdges[1], ROOM.width / 2],
  ];
  const doorSideWidth = (ROOM.width - ROOM.doorWidth) / 2;
  const doorSideX = ROOM.doorWidth / 2 + doorSideWidth / 2;
  const eastWallX = ROOM.width / 2;
  const eastExteriorX = eastWallX + ROOM.wallThickness / 2;
  const northWallZ = -ROOM.depth / 2;
  const northExteriorZ = northWallZ - ROOM.wallThickness / 2;

  const faces: WallFaceDefinition[] = [
    { key: 'west', width: ROOM.depth, height: ROOM.height, position: [westX, ROOM.height / 2, 0], rotation: [0, Math.PI / 2, 0] },
    { key: 'east-bottom', width: ROOM.depth, height: ROOM.windowBottom, position: [eastX, ROOM.windowBottom / 2, 0], rotation: [0, -Math.PI / 2, 0] },
    { key: 'east-top', width: ROOM.depth, height: ROOM.height - eastTop, position: [eastX, (ROOM.height + eastTop) / 2, 0], rotation: [0, -Math.PI / 2, 0] },
    ...eastSides.map(({ width, z }, index) => ({ key: `east-side-${index}`, width, height: ROOM.windowHeight, position: [eastX, (ROOM.windowBottom + eastTop) / 2, z] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number] })),
    ...northSpans.map(([start, end], index) => ({ key: `north-span-${index}`, width: end - start, height: ROOM.height, position: [(start + end) / 2, ROOM.height / 2, northZ] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] })),
    ...FIREPLACE_WINDOWS.centersX.flatMap((center, index) => [
      { key: `north-window-bottom-${index}`, width: windowWidth, height: FIREPLACE_WINDOWS.bottom, position: [center, FIREPLACE_WINDOWS.bottom / 2, northZ] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
      { key: `north-window-top-${index}`, width: windowWidth, height: ROOM.height - northTop, position: [center, (ROOM.height + northTop) / 2, northZ] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    ]),
    ...[-1, 1].map((side) => ({ key: `south-side-${side}`, width: doorSideWidth, height: ROOM.height, position: [side * doorSideX, ROOM.height / 2, southZ] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number] })),
    { key: 'south-header', width: ROOM.doorWidth, height: ROOM.height - ROOM.doorHeight, position: [0, (ROOM.height + ROOM.doorHeight) / 2, southZ], rotation: [0, Math.PI, 0] },
  ];

  return (
    <group>
      {faces.map((face) => <WallFace key={face.key} definition={face} material={material} />)}
      <WindowArchCap
        position={[eastExteriorX, ROOM.windowBottom, ROOM.windowCenterZ]}
        rotation={[0, -Math.PI / 2, 0]}
        width={ROOM.windowWidth}
        height={ROOM.windowHeight}
        material={material}
      />
      {FIREPLACE_WINDOWS.centersX.map((center) => (
        <WindowArchCap
          key={`north-window-arch-cap-${center}`}
          position={[center, FIREPLACE_WINDOWS.bottom, northExteriorZ]}
          width={FIREPLACE_WINDOWS.width}
          height={FIREPLACE_WINDOWS.height}
          material={material}
        />
      ))}
    </group>
  );
}

const SKIRTING_HEIGHT = 0.305;
const SKIRTING_DEPTH = 0.12;
const WOOD_TEXTURE_TILE_LENGTH = 2;

function WoodTrim() {
  const [colorSource, normalSource, packedSource] = useTexture([
    '/textures/wooden-planks/T_vjisagn_2K_B.png',
    '/textures/wooden-planks/T_vjisagn_2K_N.png',
    '/textures/wooden-planks/T_vjisagn_2K_ORM.png',
  ]);
  const [colorMap, normalMap, packedMap] = useMemo(() => {
    const maps = [colorSource.clone(), normalSource.clone(), packedSource.clone()];
    for (const map of maps) {
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      map.needsUpdate = true;
    }
    maps[0].colorSpace = SRGBColorSpace;
    maps[1].colorSpace = NoColorSpace;
    maps[2].colorSpace = NoColorSpace;
    return maps;
  }, [colorSource, normalSource, packedSource]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    roughnessMap: packedMap,
    aoMap: packedMap,
    aoMapIntensity: 0.65,
    roughness: 0.82,
    metalness: 0,
    normalScale: new Vector2(0.24, 0.24),
  }), [colorMap, normalMap, packedMap]);
  useEffect(() => () => {
    material.dispose();
    colorMap.dispose();
    normalMap.dispose();
    packedMap.dispose();
  }, [colorMap, material, normalMap, packedMap]);

  const westX = -ROOM.width / 2 + ROOM.wallThickness / 2 + 0.004;
  const eastX = ROOM.width / 2 - ROOM.wallThickness / 2 - 0.004;
  const northZ = -ROOM.depth / 2 + ROOM.wallThickness / 2 + 0.004;
  const southZ = ROOM.depth / 2 - ROOM.wallThickness / 2 - 0.004;
  const sideWidth = (ROOM.width - ROOM.doorWidth) / 2;
  const sideX = ROOM.doorWidth / 2 + sideWidth / 2;
  const segments = [
    { key: 'west', size: [SKIRTING_DEPTH, SKIRTING_HEIGHT, ROOM.depth] as [number, number, number], position: [westX + SKIRTING_DEPTH / 2 - 0.02, SKIRTING_HEIGHT / 2, 0] as [number, number, number], alongAxis: 'z' },
    { key: 'east', size: [SKIRTING_DEPTH, SKIRTING_HEIGHT, ROOM.depth] as [number, number, number], position: [eastX - SKIRTING_DEPTH / 2 + 0.02, SKIRTING_HEIGHT / 2, 0] as [number, number, number], alongAxis: 'z' },
    { key: 'north', size: [ROOM.width, SKIRTING_HEIGHT, SKIRTING_DEPTH] as [number, number, number], position: [0, SKIRTING_HEIGHT / 2, northZ + SKIRTING_DEPTH / 2 - 0.02] as [number, number, number], alongAxis: 'x' },
    ...[-1, 1].map((side) => ({
      key: `south-${side}`,
      size: [sideWidth, SKIRTING_HEIGHT, SKIRTING_DEPTH] as [number, number, number],
      position: [side * sideX, SKIRTING_HEIGHT / 2, southZ - SKIRTING_DEPTH / 2 + 0.02] as [number, number, number],
      alongAxis: 'x',
    })),
    { key: 'top-west', size: [SKIRTING_DEPTH, SKIRTING_HEIGHT, ROOM.depth] as [number, number, number], position: [westX + SKIRTING_DEPTH / 2 - 0.02, ROOM.height - SKIRTING_HEIGHT / 2, 0] as [number, number, number], alongAxis: 'z' },
    { key: 'top-east', size: [SKIRTING_DEPTH, SKIRTING_HEIGHT, ROOM.depth] as [number, number, number], position: [eastX - SKIRTING_DEPTH / 2 + 0.02, ROOM.height - SKIRTING_HEIGHT / 2, 0] as [number, number, number], alongAxis: 'z' },
    { key: 'top-north', size: [ROOM.width, SKIRTING_HEIGHT, SKIRTING_DEPTH] as [number, number, number], position: [0, ROOM.height - SKIRTING_HEIGHT / 2, northZ + SKIRTING_DEPTH / 2 - 0.02] as [number, number, number], alongAxis: 'x' },
    { key: 'top-south', size: [ROOM.width, SKIRTING_HEIGHT, SKIRTING_DEPTH] as [number, number, number], position: [0, ROOM.height - SKIRTING_HEIGHT / 2, southZ - SKIRTING_DEPTH / 2 + 0.02] as [number, number, number], alongAxis: 'x' },
    ...([-1, 1] as const).flatMap((xSide) => ([-1, 1] as const).map((zSide) => ({
      key: `corner-${xSide}-${zSide}`,
      size: [0.16, ROOM.height, 0.16] as [number, number, number],
      position: [
        xSide * (ROOM.width / 2 - ROOM.wallThickness / 2 - 0.004 - 0.035),
        ROOM.height / 2,
        zSide * (ROOM.depth / 2 - ROOM.wallThickness / 2 - 0.004 - 0.035),
      ] as [number, number, number],
      alongAxis: 'x',
    }))),
  ];
  const geometries = useMemo(() => segments.map(({ size, alongAxis }) => {
    const geometry = new THREE.BoxGeometry(...size);
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    const horizontalLength = alongAxis === 'x' ? size[0] : size[2];
    const verticalWoodGrain = size[1] > SKIRTING_HEIGHT + 0.01;
    for (let index = 0; index < positions.count; index += 1) {
      const normalX = Math.abs(normals.getX(index)) > 0.5;
      const normalZ = Math.abs(normals.getZ(index)) > 0.5;
      const isLongFace = verticalWoodGrain
        ? normalX || normalZ
        : alongAxis === 'x' ? normalZ : normalX;
      if (!isLongFace) continue;
      const horizontal = verticalWoodGrain
        ? normalZ ? positions.getX(index) : positions.getZ(index)
        : alongAxis === 'x' ? positions.getX(index) : positions.getZ(index);
      uv.setXY(
        index,
        verticalWoodGrain
          ? (horizontal + (normalZ ? size[0] : size[2]) / 2)
          : (positions.getY(index) + size[1] / 2),
        verticalWoodGrain
          ? (positions.getY(index) + size[1] / 2) / WOOD_TEXTURE_TILE_LENGTH
          : (horizontal + horizontalLength / 2) / WOOD_TEXTURE_TILE_LENGTH,
      );
    }
    uv.needsUpdate = true;
    geometry.setAttribute('uv2', uv.clone());
    return geometry;
  }), []);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);

  return (
    <group>
      {segments.map((segment, index) => (
        <mesh key={segment.key} geometry={geometries[index]} material={material} position={segment.position} castShadow receiveShadow />
      ))}
    </group>
  );
}

export function Room({ onBookSelected }: { onBookSelected: (book: ShelfBook) => void }) {
  return (
    <>
      <color attach="background" args={['#171411']} />
      <fog attach="fog" args={['#171411', 8, 18]} />
      <Lighting />
      <Dust />

      <TexturedFloor />
      <FireplaceWall />
      <mesh position={[-ROOM.width / 2, ROOM.height / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color={WALL_BASE_COLOR} side={DoubleSide} roughness={0.94} />
      </mesh>
      <EastWindow />
      <Doorway />
      <WallFinish />
      <WoodTrim />
      <mesh position={[0, ROOM.height, 0]}>
        <boxGeometry args={[ROOM.width, ROOM.wallThickness, ROOM.depth]} />
        <WoodPlankMaterial width={ROOM.width} height={ROOM.depth} />
      </mesh>
      <LoungeAndWindowSeat />
      <Suspense fallback={null}><CandleTables /></Suspense>

      {BOOKCASES.map((bookcase, index) => (
        <Bookcase
          key={index}
          kind={bookcase.kind}
          position={bookcase.position}
          rotation={bookcase.rotation}
          scale={bookcase.scale}
          hasCandles={BOOKCASE_CANDLE_INDICES.includes(index)}
          candleVariant={index}
        />
      ))}
      <Fireplace />
      <BookSelectionController books={SHELF_BOOKS} onSelect={onBookSelected} />
      <Suspense fallback={null}><BookShelf books={SHELF_BOOKS} /></Suspense>
    </>
  );
}
