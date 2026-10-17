'use client';

import { Fragment, Suspense, useEffect, useMemo, useState } from 'react';
import { DoubleSide, ExtrudeGeometry, NoColorSpace, RepeatWrapping, Shape, SRGBColorSpace, Vector2 } from 'three';
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
          <meshStandardMaterial color="#33291f" roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[0, (ROOM.height + ROOM.doorHeight) / 2, ROOM.depth / 2]}>
        <boxGeometry args={[ROOM.doorWidth, ROOM.height - ROOM.doorHeight, ROOM.wallThickness]} />
        <meshStandardMaterial color="#33291f" roughness={0.92} />
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
        <meshStandardMaterial color="#3c3025" roughness={0.92} />
      </mesh>
      <mesh position={[wallX, (ROOM.height + top) / 2, 0]}>
        <boxGeometry args={[ROOM.wallThickness, ROOM.height - top, ROOM.depth]} />
        <meshStandardMaterial color="#3c3025" roughness={0.92} />
      </mesh>
      {sideSegments.map(({ depth, z }) => (
        <mesh key={z} position={[wallX, (bottom + top) / 2, z]}>
          <boxGeometry args={[ROOM.wallThickness, height, depth]} />
          <meshStandardMaterial color="#3c3025" roughness={0.92} />
        </mesh>
      ))}
      <WindowArchCap
        position={[wallX + ROOM.wallThickness / 2, bottom, centerZ]}
        rotation={[0, -Math.PI / 2, 0]}
        width={width}
        height={height}
        color="#3c3025"
      />
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
  color,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  color: string;
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
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.92} side={DoubleSide} />
    </mesh>
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
  const material = <meshStandardMaterial color="#33291f" roughness={0.92} />;
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
          <WindowArchCap
            position={[center, bottom, wallZ - ROOM.wallThickness / 2]}
            width={width}
            height={height}
            color="#33291f"
          />
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

export function Room({ onBookSelected }: { onBookSelected: (book: ShelfBook) => void }) {
  const [showBookSlots, setShowBookSlots] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyB' || event.repeat) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      setShowBookSlots((visible) => !visible);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
        <meshStandardMaterial color="#3c3025" side={DoubleSide} roughness={0.92} />
      </mesh>
      <EastWindow />
      <Doorway />
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
      {showBookSlots && SHELF_BOOKS.map((book) => (
        <mesh key={`slot-${book.id}`} position={book.position} rotation={[0, book.rotationY, book.lean]}>
          <boxGeometry args={[book.thickness, book.height, book.depth]} />
          <meshBasicMaterial color="#56d9ff" wireframe transparent opacity={0.45} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}
