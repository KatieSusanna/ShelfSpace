'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { registerBook, type ShelfBook } from '@/lib/useBookSelection';

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
  canvas.width = 64; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    // Keep the lettering horizontal across the spine; short wrapped lines fit its narrow width.
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillStyle = '#f1e7cf'; context.font = 'bold 12px Georgia';
    context.shadowColor = 'rgba(20, 12, 7, 0.9)'; context.shadowBlur = 4;
    const words = title.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > 56) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    const lineHeight = 15;
    const titleStart = canvas.height * 0.4 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((titleLine, index) => context.fillText(titleLine, canvas.width / 2, titleStart + index * lineHeight, 58));
    context.fillStyle = '#e0d2b4'; context.font = '9px Georgia';
    context.fillText(author, canvas.width / 2, canvas.height * 0.75, 58);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeCoverLabel(title: string, leather: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 384;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = leather;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#d6b777';
    context.lineWidth = 4;
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    context.fillStyle = '#f2e5cc';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = 'bold 23px Georgia';
    context.shadowColor = 'rgba(20, 12, 7, 0.65)'; context.shadowBlur = 5;
    const words = title.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > 215) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    const lineHeight = 29;
    const start = canvas.height * 0.38 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((text, index) => context.fillText(text, canvas.width / 2, start + index * lineHeight, 220));
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

function AssetBook({ book, piece, material }: { book: ShelfBook; piece: Piece; material: THREE.MeshStandardMaterial }) {
  const group = useRef<THREE.Group>(null);
  const hitMesh = useRef<THREE.Mesh>(null);
  const highlight = useRef<THREE.Group>(null);
  const outlineGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(piece.size.x, piece.size.y, piece.size.z);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [piece]);
  const label = useMemo(() => makeSpineLabel(book.title, book.author), [book.author, book.title]);
  const cover = useMemo(() => makeCoverLabel(book.title, book.leather), [book.leather, book.title]);
  const hitGeometry = useMemo(() => new THREE.BoxGeometry(book.thickness, book.height, book.depth), [book.depth, book.height, book.thickness]);
  const labelGeometry = useMemo(() => new THREE.PlaneGeometry(book.thickness * 0.82, book.height * 0.86), [book.height, book.thickness]);
  const coverGeometry = useMemo(() => new THREE.PlaneGeometry(book.depth * 0.86, book.height * 0.9), [book.depth, book.height]);
  const labelMaterial = useMemo(() => new THREE.MeshBasicMaterial({ map: label, transparent: true, depthWrite: false, toneMapped: false }), [label]);
  const coverMaterial = useMemo(() => new THREE.MeshBasicMaterial({ map: cover, side: THREE.DoubleSide, toneMapped: false }), [cover]);
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
  useEffect(() => () => { label.dispose(); cover.dispose(); labelGeometry.dispose(); coverGeometry.dispose(); hitGeometry.dispose(); labelMaterial.dispose(); coverMaterial.dispose(); outlineGeometry.dispose(); }, [cover, coverGeometry, coverMaterial, hitGeometry, label, labelGeometry, labelMaterial, outlineGeometry]);
  return (
    <group ref={group} userData={{ bookId: book.id }}>
      <mesh
        geometry={BOOK_PICK_GEOMETRY}
        material={BOOK_PICK_MATERIAL}
        scale={[book.thickness * 0.96, book.height * 0.98, book.depth * 0.98]}
        userData={{ bookPickTarget: true }}
        dispose={null}
      />
      <mesh geometry={piece.geometry} material={material} scale={[book.thickness / piece.size.x, book.height / piece.size.y, book.depth / piece.size.z]}>
        <group ref={highlight} visible={false} scale={[1.04, 1.03, 1.03]}>
          <lineSegments geometry={outlineGeometry}>
            <lineBasicMaterial color="#ffffff" transparent opacity={1} depthTest />
          </lineSegments>
        </group>
      </mesh>
      <mesh ref={hitMesh} geometry={hitGeometry} visible={false} />
      <mesh geometry={labelGeometry} material={labelMaterial} position={[0, 0, book.depth / 2 + 0.002]} />
      <mesh geometry={coverGeometry} material={coverMaterial} position={[book.thickness / 2 + 0.002, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
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
