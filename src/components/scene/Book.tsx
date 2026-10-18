'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Html, Outlines, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { registerBook, type ShelfBook, useSelectionState } from '@/lib/useBookSelection';
import { BookPageDetails } from '@/components/ui/BookPageDetails';
import { BookPageReview } from '@/components/ui/BookPageReview';
import { getBookPageDistanceFactor } from '@/lib/bookPageLayout';
import { useBookMetadata } from '@/store/bookMetadata';

type Piece = { geometry: THREE.BufferGeometry; size: THREE.Vector3 };
type Props = { book: ShelfBook; pieces: Piece[]; materials: THREE.MeshStandardMaterial[] };
const BOOK_PICK_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const BOOK_PICK_MATERIAL = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
});

function makeSpineLabel(title: string, author: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#f1e7cf';
    context.font = 'bold 24px Georgia';
    context.shadowColor = 'rgba(20, 12, 7, 0.9)';
    context.shadowBlur = 5;
    const words = title.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > 112) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    const lineHeight = 30;
    const start = canvas.height * 0.4 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((text, index) => context.fillText(text, canvas.width / 2, start + index * lineHeight, 116));
    context.fillStyle = '#e0d2b4';
    context.font = '18px Georgia';
    context.fillText(author, canvas.width / 2, canvas.height * 0.75, 116);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// The downloaded file contains three books joined together. Split its triangles
// into three separate shapes so each book can have its own shelf position.
function splitBooks(scene: THREE.Group): Piece[] {
  scene.updateMatrixWorld(true);
  let source: THREE.Mesh | null = null;
  scene.traverse((object) => { if (!source && object instanceof THREE.Mesh) source = object; });
  if (!source) throw new Error('The book asset contains no mesh.');
  const mesh = source as THREE.Mesh;
  const original = mesh.geometry;
  const positions = original.getAttribute('position');
  const index = original.index;
  if (!index) throw new Error('The book asset needs indexed geometry.');
  const buckets: number[][] = [[], [], []];
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(positions, index.getX(i)).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(positions, index.getX(i + 1)).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(positions, index.getX(i + 2)).applyMatrix4(mesh.matrixWorld);
    const x = (a.x + b.x + c.x) / 3;
    const piece = x < -0.026 ? 0 : x < 0.0315 ? 1 : 2;
    buckets[piece]?.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  }
  return buckets.map((triangles) => {
    const geometry = original.clone();
    geometry.setIndex(triangles);
    geometry.clearGroups();
    geometry.setDrawRange(0, triangles.length);
    geometry.applyMatrix4(mesh.matrixWorld);
    const bounds = new THREE.Box3();
    const vertex = new THREE.Vector3();
    for (const vertexIndex of triangles) bounds.expandByPoint(vertex.fromBufferAttribute(geometry.getAttribute('position'), vertexIndex));
    const center = bounds.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.computeVertexNormals();
    // Ignore unused vertices left behind by the geometry clone when setting bounds.
    const actualBounds = new THREE.Box3();
    for (const vertexIndex of triangles) actualBounds.expandByPoint(vertex.fromBufferAttribute(geometry.getAttribute('position'), vertexIndex));
    geometry.boundingBox = actualBounds;
    geometry.boundingSphere = actualBounds.getBoundingSphere(new THREE.Sphere());
    const size = actualBounds.getSize(new THREE.Vector3());
    return { geometry, size };
  });
}

function makeNeutralTexture(source: THREE.Texture | null): THREE.CanvasTexture | null {
  if (!source || typeof document === 'undefined') return null;
  const image = source.image as CanvasImageSource | undefined;
  if (!image) return null;
  const canvas = document.createElement('canvas');
  const dimensions = image as { width?: number; height?: number };
  const sourceWidth = dimensions.width ?? 512;
  const sourceHeight = dimensions.height ?? 512;
  const scale = Math.min(1, 1024 / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.filter = 'grayscale(1) brightness(1.5)';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = source.flipY;
  texture.wrapS = source.wrapS; texture.wrapT = source.wrapT;
  texture.repeat.copy(source.repeat); texture.offset.copy(source.offset);
  return texture;
}

function WhitePageBlock({ book, bookMaterial }: { book: ShelfBook; bookMaterial: THREE.MeshStandardMaterial }) {
  const viewportHeight = useThree((state) => state.size.height);
  const pageDistanceFactor = getBookPageDistanceFactor(viewportHeight);
  const pageWidth = book.depth;
  const pageThickness = 0.026;
  const pageHeight = 0.3;
  const backingGeometry = useMemo(() => new THREE.BoxGeometry(pageWidth * 1.88, pageHeight, pageThickness * 1.5), [pageHeight, pageThickness, pageWidth]);
  const pageGeometry = useMemo(() => new THREE.BoxGeometry(pageWidth, pageHeight, pageThickness), [pageHeight, pageThickness, pageWidth]);
  const borderWidth = Math.min(pageWidth, pageHeight) * 0.035;
  const middleLineGeometry = useMemo(() => new THREE.BoxGeometry(borderWidth * 0.6, pageHeight * 1.045, pageThickness * 0.32), [borderWidth, pageHeight, pageThickness]);
  const leatherGrain = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const image = context.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4;
        const grain = Math.sin(x * 1.71 + y * 0.43) * Math.cos(y * 1.23 - x * 0.37);
        const value = Math.round(150 + grain * 38);
        image.data[index] = value;
        image.data[index + 1] = value;
        image.data[index + 2] = value;
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
  }, []);
  const pageMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, depthTest: false, depthWrite: false, transparent: true, opacity: 1 }), []);
  const middleLineMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#b8b8b8', toneMapped: false, depthTest: false, depthWrite: false, transparent: true, opacity: 1 }), []);
  const backingMaterial = useMemo(() => {
    const material = bookMaterial.clone();
    material.bumpMap = leatherGrain;
    material.bumpScale = 0.014;
    material.roughness = 0.72;
    material.depthTest = false;
    material.depthWrite = false;
    material.transparent = true;
    material.opacity = 1;
    return material;
  }, [bookMaterial, leatherGrain]);
  useEffect(() => () => {
    pageGeometry.dispose(); backingGeometry.dispose(); middleLineGeometry.dispose();
    pageMaterial.dispose(); middleLineMaterial.dispose(); backingMaterial.dispose(); leatherGrain?.dispose();
  }, [backingGeometry, backingMaterial, leatherGrain, middleLineGeometry, middleLineMaterial, pageGeometry, pageMaterial]);
  return (
    <group>
      <mesh geometry={backingGeometry} material={backingMaterial} position={[0, 0, -pageThickness * 0.2]} renderOrder={99998} frustumCulled={false} />
      <group renderOrder={99999}>
        <mesh geometry={pageGeometry} material={pageMaterial} position={[-pageWidth * 0.44, 0, 0]} renderOrder={99999} frustumCulled={false} />
        <mesh geometry={pageGeometry} material={pageMaterial} position={[pageWidth * 0.44, 0, 0]} renderOrder={99999} frustumCulled={false} />
      </group>
      <group position={[0, 0, pageThickness * 0.42]} renderOrder={1000000}>
        <mesh geometry={middleLineGeometry} material={middleLineMaterial} position={[0, -pageHeight * 0.01, 0]} renderOrder={1000000} frustumCulled={false} />
      </group>
      <Html transform distanceFactor={pageDistanceFactor} position={[pageWidth * 0.44, 0, pageThickness * 0.65]} rotation={[0, Math.PI, 0]} pointerEvents="auto" zIndexRange={[8, 8]}>
        <BookPageDetails book={book} />
      </Html>
      <Html transform distanceFactor={pageDistanceFactor} position={[-pageWidth * 0.44, 0, pageThickness * 0.65]} rotation={[0, Math.PI, 0]} pointerEvents="auto" zIndexRange={[8, 8]}>
        <BookPageReview book={book} />
      </Html>
    </group>
  );
}

function SideTurnView({ turned, book, bookMaterial, children }: { turned: boolean; book: ShelfBook; bookMaterial: THREE.MeshStandardMaterial; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const [sideReady, setSideReady] = useState(false);
  useLayoutEffect(() => {
    if (!group.current) return;
    setSideReady(false);
    const tween = gsap.to(group.current.rotation, {
      y: turned ? -Math.PI / 2 : 0,
      duration: 1.1,
      ease: 'power2.inOut',
      onComplete: () => {
        setSideReady(turned);
        if (turned && document.pointerLockElement) document.exitPointerLock();
      },
    });
    return () => { tween.kill(); };
  }, [turned]);
  return (
    <group ref={group}>
      <group visible={!sideReady}>{children}</group>
      {turned && sideReady && <WhitePageBlock book={book} bookMaterial={bookMaterial} />}
    </group>
  );
}

function AssetBook({ book, piece, material }: { book: ShelfBook; piece: Piece; material: THREE.MeshStandardMaterial }) {
  const group = useRef<THREE.Group>(null);
  const hitMesh = useRef<THREE.Mesh>(null);
  const highlight = useRef<THREE.Group>(null);
  const isHighlighted = useSelectionState((state) => state.hoveredId === book.id);
  const isOpen = useSelectionState((state) => state.openBookId === book.id);
  const isHeld = useSelectionState((state) => state.heldBookId === book.id);
  const scanned = useBookMetadata((state) => state.metadataByBookId[book.id]);
  const hasScannedTitle = Boolean(scanned?.title.trim());
  const spineLabel = useMemo(
    () => hasScannedTitle ? makeSpineLabel(scanned!.title, scanned!.authors.join('; ')) : null,
    [hasScannedTitle, scanned],
  );
  const spineGeometry = useMemo(
    () => hasScannedTitle ? new THREE.PlaneGeometry(book.thickness * 0.82, book.height * 0.86) : null,
    [book.height, book.thickness, hasScannedTitle],
  );
  const spineMaterial = useMemo(
    () => spineLabel ? new THREE.MeshBasicMaterial({ map: spineLabel, transparent: true, depthWrite: false, toneMapped: false }) : null,
    [spineLabel],
  );
  const hitGeometry = useMemo(() => new THREE.BoxGeometry(book.thickness, book.height, book.depth), [book.depth, book.height, book.thickness]);
  // Keep the original shelf transform out of JSX: selection animations and camera
  // attachment are imperative, so a hover rerender must not snap the book back.
  useLayoutEffect(() => {
    if (!group.current) return;
    group.current.position.fromArray(book.position);
    group.current.rotation.set(0, book.rotationY, book.lean);
  }, [book.lean, book.position, book.rotationY]);
  useEffect(() => {
    registerBook(book.id, group.current, hitMesh.current, highlight.current);
    return () => registerBook(book.id, null, null, null);
  }, [book.id]);
  useEffect(() => () => { spineLabel?.dispose(); }, [spineLabel]);
  useEffect(() => () => { spineGeometry?.dispose(); }, [spineGeometry]);
  useEffect(() => () => { spineMaterial?.dispose(); }, [spineMaterial]);
  useEffect(() => () => { hitGeometry.dispose(); }, [hitGeometry]);
  return (
    <group ref={group} userData={{ bookId: book.id }}>
      <mesh
        geometry={BOOK_PICK_GEOMETRY}
        material={BOOK_PICK_MATERIAL}
        scale={[book.thickness * 0.96, book.height * 0.98, book.depth * 0.98]}
        userData={{ bookPickTarget: true }}
        dispose={null}
      />
      <SideTurnView turned={isOpen} book={book} bookMaterial={material}>
        <mesh geometry={piece.geometry} material={material} scale={[book.thickness / piece.size.x, book.height / piece.size.y, book.depth / piece.size.z]} />
        <group ref={highlight} visible={isHighlighted && !isOpen}>
          <mesh geometry={piece.geometry} scale={[book.thickness / piece.size.x, book.height / piece.size.y, book.depth / piece.size.z]}>
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
            <Outlines color="#ffffff" thickness={1.5} toneMapped={false} />
          </mesh>
        </group>
        {spineLabel && spineMaterial && spineGeometry && (
          <mesh geometry={spineGeometry} material={spineMaterial} position={[0, 0, book.depth / 2 + 0.002]} />
        )}
      </SideTurnView>
      {isHeld && (
        <Html position={[0, book.height * 0.72, 0]} center pointerEvents="none" zIndexRange={[9, 9]}>
          <div className="scan-book-hint">Press <kbd>B</kbd> to add a new book to my library</div>
        </Html>
      )}
      <mesh ref={hitMesh} geometry={hitGeometry} visible={false} />
    </group>
  );
}

export function BookShelf({ books }: { books: ShelfBook[] }) {
  const { scene } = useGLTF('/models/sm-books/scene.gltf');
  const pieces = useMemo(() => splitBooks(scene), [scene]);
  const sourceMesh = useMemo(() => {
    let found: THREE.Mesh | null = null;
    scene.traverse((object) => { if (!found && object instanceof THREE.Mesh) found = object; });
    return found;
  }, [scene]);
  const sourceMaterial = (sourceMesh as THREE.Mesh | null)?.material;
  const materialSet = Array.isArray(sourceMaterial) ? sourceMaterial[0] : sourceMaterial;
  const texturedMaterial = materialSet instanceof THREE.MeshStandardMaterial ? materialSet : null;
  const neutralMap = useMemo(() => makeNeutralTexture(texturedMaterial?.map ?? null), [texturedMaterial]);
  const colours = ['#8e3440', '#496d50', '#795332', '#465f88', '#a37737', '#785578', '#397376', '#b25536', '#4d6240', '#3e617a', '#8a5264', '#73704a'];
  const materials = useMemo(() => colours.map((colour, index) => {
    const material = texturedMaterial?.clone() ?? new THREE.MeshStandardMaterial();
    if (neutralMap) material.map = neutralMap;
    material.color.set(colour).multiplyScalar(0.92 + (index % 3) * 0.06);
    material.roughness = 0.62 + (index % 4) * 0.07;
    material.needsUpdate = true;
    return material;
  }), [texturedMaterial, neutralMap]);
  useEffect(() => () => {
    pieces.forEach((piece) => piece.geometry.dispose());
    materials.forEach((material) => material.dispose());
    neutralMap?.dispose();
  }, [materials, neutralMap, pieces]);

  return <>{books.map((book) => {
    const piece = pieces[book.assetPiece];
    if (!piece) return null;
    const material = materials[(Number(book.id.match(/\d+$/)?.[0] ?? 1) - 1) % materials.length];
    return <AssetBook key={book.id} book={book} piece={piece} material={material} />;
  })}</>;
}

useGLTF.preload('/models/sm-books/scene.gltf');
