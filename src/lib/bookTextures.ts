'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { SHELF_BOOKS, LEATHER_PALETTE } from '@/config/books';

export type LeatherMaterials = {
  leather: Map<string, THREE.MeshStandardMaterial>;
  pages: THREE.MeshStandardMaterial;
};
type TextureSet = { color: THREE.Texture | null; normal: THREE.Texture | null; roughness: THREE.Texture | null; pages: THREE.Texture };

function makePageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#eee4ce'; context.fillRect(0, 0, 64, 256);
    context.strokeStyle = '#c8bda8'; context.lineWidth = 1;
    for (let y = 8; y < 256; y += 6) { context.beginPath(); context.moveTo(0, y); context.lineTo(64, y); context.stroke(); }
    context.fillStyle = '#d7cbb4';
    for (let x = 3; x < 64; x += 11) for (let y = (x * 7) % 13; y < 256; y += 19) context.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeFallbackLeather() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#a8a8a8'; context.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) {
      const n = Math.random() * 35 - 17;
      context.fillStyle = `rgb(${Math.max(0, Math.min(255, 168 + n))},${Math.max(0, Math.min(255, 168 + n))},${Math.max(0, Math.min(255, 168 + n))})`;
      context.fillRect(x, y, 2, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function toNeutralLeather(source: THREE.Texture) {
  const image = source.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement('canvas');
  canvas.width = image.width || 512; canvas.height = image.height || 512;
  const context = canvas.getContext('2d');
  if (context) {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const gray = pixels.data[index] * 0.3 + pixels.data[index + 1] * 0.59 + pixels.data[index + 2] * 0.11;
      const normalized = Math.max(0, Math.min(255, 166 + (gray - 128) * 0.42));
      pixels.data[index] = normalized; pixels.data[index + 1] = normalized; pixels.data[index + 2] = normalized;
    }
    context.putImageData(pixels, 0, 0);
  }
  const neutral = new THREE.CanvasTexture(canvas);
  neutral.colorSpace = THREE.SRGBColorSpace;
  return neutral;
}

function setTile(texture: THREE.Texture | null) {
  if (!texture) return;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
}

// The four leather images load once here and every book shares their GPU textures.
export function useLeatherMaterials(): LeatherMaterials {
  const [maps, setMaps] = useState<TextureSet>(() => ({ color: null, normal: null, roughness: null, pages: makePageTexture() }));

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let alive = true;
    const owned: THREE.Texture[] = [maps.pages];
    const load = (url: string, done: (texture: THREE.Texture) => void) => {
      const texture = loader.load(url, (loaded) => { if (alive) { setTile(loaded); done(loaded); } });
      owned.push(texture);
    };
    const neutralFallback = makeFallbackLeather();
    owned.push(neutralFallback);
    let color: THREE.Texture | null = null;
    let normal: THREE.Texture | null = null;
    let roughness: THREE.Texture | null = null;
    const update = () => { if (alive) setMaps((previous) => ({ ...previous, color: color ?? neutralFallback, normal, roughness })); };
    load('/models/sm-books/textures/Leather033A_1K-JPG_Color.jpg', (source) => {
      const neutral = toNeutralLeather(source);
      setTile(neutral); owned.push(neutral); color = neutral; source.dispose(); update();
    });
    load('/models/sm-books/textures/Leather033A_1K-JPG_NormalGL.jpg', (texture) => { normal = texture; update(); });
    load('/models/sm-books/textures/Leather033A_1K-JPG_Roughness.jpg', (texture) => { roughness = texture; update(); });
    const fallbackTimer = window.setTimeout(update, 2500);
    return () => { alive = false; window.clearTimeout(fallbackTimer); owned.forEach((texture) => texture.dispose()); };
    // `pages` is created for this component lifetime, so the loader effect runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leather = useMemo(() => {
    const pool = new Map<string, THREE.MeshStandardMaterial>();
    for (const hex of LEATHER_PALETTE) {
      const material = new THREE.MeshStandardMaterial({ color: hex, map: maps.color, normalMap: maps.normal, roughnessMap: maps.roughness, roughness: 0.7, metalness: 0.02 });
      setTile(material.map); setTile(material.normalMap); setTile(material.roughnessMap);
      pool.set(hex, material);
    }
    return pool;
  }, [maps.color, maps.normal, maps.roughness]);
  const pages = useMemo(() => new THREE.MeshStandardMaterial({ map: maps.pages, color: '#fff6e4', roughness: 0.94 }), [maps.pages]);

  useEffect(() => () => { leather.forEach((material) => material.dispose()); pages.dispose(); }, [leather, pages]);
  return { leather, pages };
}

