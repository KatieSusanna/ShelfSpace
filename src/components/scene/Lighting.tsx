'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIREPLACE_WINDOWS, ROOM } from '@/config/layout';

type WindowBackdropProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  seed: number;
  sunX: number;
  showSun: boolean;
  theme: number;
};

const WINDOW_THEMES = [
  { sky: '#45344b', horizon: '#efa06d', far: '#a8848c', mid: '#755c70', near: '#4d4354', mist: '#e7b896' },
  { sky: '#3d3549', horizon: '#e58a5f', far: '#958093', mid: '#685c74', near: '#464353', mist: '#d8b29e' },
  { sky: '#40354d', horizon: '#efaa73', far: '#9c8190', mid: '#705d72', near: '#484454', mist: '#e2b697' },
] as const;

function MountainWindowView({ position, rotation = [0, 0, 0], width, height, seed, sunX, showSun, theme }: WindowBackdropProps) {
  const colors = WINDOW_THEMES[theme] ?? WINDOW_THEMES[0];
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: seed },
      uSun: { value: new THREE.Vector2(sunX, 0.43) },
      uShowSun: { value: showSun ? 1 : 0 },
      uSky: { value: new THREE.Color(colors.sky) },
      uHorizon: { value: new THREE.Color(colors.horizon) },
      uFar: { value: new THREE.Color(colors.far) },
      uMid: { value: new THREE.Color(colors.mid) },
      uNear: { value: new THREE.Color(colors.near) },
      uMist: { value: new THREE.Color(colors.mist) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uSeed;
      uniform vec2 uSun;
      uniform float uShowSun;
      uniform vec3 uSky;
      uniform vec3 uHorizon;
      uniform vec3 uFar;
      uniform vec3 uMid;
      uniform vec3 uNear;
      uniform vec3 uMist;
      varying vec2 vUv;

      float hash(float n) {
        return fract(sin(n) * 43758.5453123);
      }

      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), f);
      }

      float ridge(float x, float seed, float base, float amplitude) {
        float broad = noise(x * 3.1 + seed) * 0.58;
        float medium = noise(x * 7.4 + seed * 2.3) * 0.29;
        float fine = noise(x * 15.7 + seed * 4.1) * 0.13;
        return base + ((broad + medium + fine) - 0.5) * amplitude;
      }

      void main() {
        float x = vUv.x;
        float y = vUv.y;
        float skyFade = smoothstep(0.24, 1.0, y);
        vec3 color = mix(uHorizon, uSky, skyFade);

        float farLine = ridge(x, uSeed, 0.39, 0.15);
        float midLine = ridge(x, uSeed + 11.7, 0.29, 0.105);
        float nearLine = ridge(x, uSeed + 27.3, 0.19, 0.065);
        float farShape = 1.0 - smoothstep(farLine - 0.003, farLine + 0.003, y);
        float midShape = 1.0 - smoothstep(midLine - 0.003, midLine + 0.003, y);
        float nearShape = 1.0 - smoothstep(nearLine - 0.003, nearLine + 0.003, y);
        color = mix(color, uFar, farShape * 0.82);
        color = mix(color, uMid, midShape);
        color = mix(color, uNear, nearShape);

        float hazeCenter = 0.27 + (noise(x * 3.8 + uSeed) - 0.5) * 0.065;
        float distantMist = exp(-abs(y - hazeCenter) * 28.0) * 0.42;
        float lowMist = (1.0 - smoothstep(0.12, 0.29, y)) * 0.17;
        color = mix(color, uMist, clamp(distantMist + lowMist, 0.0, 0.6));

        float sunDistance = distance(vUv, uSun);
        float halo = exp(-sunDistance * 10.0) * 0.38 * uShowSun;
        float sunDisc = (1.0 - smoothstep(0.038, 0.048, sunDistance)) * uShowSun;
        color = mix(color, vec3(1.0, 0.72, 0.42), sunDisc);
        color += vec3(0.45, 0.18, 0.055) * halo;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  }), [colors, seed, showSun, sunX]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function Sunbeam({
  position,
  rotation,
  size,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float across = smoothstep(0.0, 0.22, vUv.x) * (1.0 - smoothstep(0.78, 1.0, vUv.x));
        float along = 1.0 - smoothstep(0.08, 0.98, vUv.y);
        float softVariation = 0.88 + 0.12 * sin(vUv.y * 18.0 + vUv.x * 7.0);
        float alpha = across * along * softVariation * 0.075;
        gl_FragColor = vec4(1.0, 0.55, 0.25, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), []);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// Warm window light and soft pools on the floor sell the late-sunset atmosphere
// without enabling shadow maps or expensive volumetric effects.
export function Lighting() {
  const leftLamp = useRef<THREE.PointLight>(null);
  const rightLamp = useRef<THREE.PointLight>(null);
  const fireGlow = useRef<THREE.PointLight>(null);
  const windowHeight = FIREPLACE_WINDOWS.height;
  const windowBottom = FIREPLACE_WINDOWS.bottom;
  const windowWidth = FIREPLACE_WINDOWS.width;
  const northWallZ = -ROOM.depth / 2;
  const eastWallX = ROOM.width / 2;

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (leftLamp.current) {
      leftLamp.current.intensity = 11 + Math.sin(time * 6.3) * 0.55 + Math.sin(time * 12.7) * 0.22;
    }
    if (rightLamp.current) {
      rightLamp.current.intensity = 10.5 + Math.sin(time * 5.8 + 1) * 0.48 + Math.sin(time * 10.9) * 0.2;
    }
    if (fireGlow.current) {
      fireGlow.current.intensity = 13 + Math.sin(time * 8.1) * 1.5 + Math.sin(time * 15.4) * 0.55;
    }
  });

  return (
    <>
      {/* The backdrops are only visible through the three open window arches. */}
      {FIREPLACE_WINDOWS.centersX.map((x, index) => (
        <MountainWindowView
          key={`north-sky-${x}`}
          position={[x, windowBottom + windowHeight / 2, northWallZ - ROOM.wallThickness / 2 - 0.03]}
          width={windowWidth}
          height={windowHeight}
          seed={index === 0 ? 3.4 : 8.7}
          sunX={0.76}
          showSun={index === 0}
          theme={index}
        />
      ))}
      <MountainWindowView
        position={[eastWallX + ROOM.wallThickness / 2 + 0.03, windowBottom + windowHeight / 2, ROOM.windowCenterZ]}
        rotation={[0, -Math.PI / 2, 0]}
        width={windowWidth}
        height={windowHeight}
        seed={19.2}
        sunX={0.52}
        showSun={false}
        theme={2}
      />

      <hemisphereLight args={['#ffc184', '#21100c', 0.72]} />
      <ambientLight intensity={0.38} color="#f0c18f" />

      {/* Sunset enters from the north and east windows and falls toward the lounge. */}
      {FIREPLACE_WINDOWS.centersX.map((x) => (
        <spotLight
          key={`north-sun-${x}`}
          position={[x, 2.15, northWallZ - 0.22]}
          color="#ffad68"
          intensity={20}
          distance={10}
          angle={0.55}
          penumbra={0.88}
          decay={1.7}
        />
      ))}
      <spotLight
        position={[eastWallX + 0.22, 2.15, ROOM.windowCenterZ]}
        color="#ffb36e"
        intensity={18}
        distance={10}
        angle={0.55}
        penumbra={0.88}
        decay={1.7}
      />

      {/* Broad, faint shafts catch the floating dust as the sun crosses the room. */}
      {FIREPLACE_WINDOWS.centersX.map((x) => (
        <Sunbeam
          key={`north-beam-${x}`}
          position={[x * 0.62, 0.035, -3.15]}
          rotation={[Math.PI / 2, 0, 0]}
          size={[0.92, 3.7]}
        />
      ))}
      <Sunbeam
        position={[3.35, 0.036, ROOM.windowCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[3.25, 0.92]}
      />

      {/* Low, gently flickering lantern light keeps the shelves readable. */}
      <pointLight ref={leftLamp} position={[-3.25, 2.4, -1.8]} color="#ffb86c" distance={11} decay={2} />
      <pointLight ref={rightLamp} position={[3.25, 2.4, -1.8]} color="#ffc178" distance={11} decay={2} />
      <pointLight ref={fireGlow} position={[0, 0.85, -3.72]} color="#ff6b32" distance={5.2} decay={2} />

      {[-3, 3].map((x) => (
        <group key={x} position={[x * 1.08, 0, -1.8]}>
          <mesh position={[0, 2.9, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.38, 8]} />
            <meshStandardMaterial color="#725334" metalness={0.55} roughness={0.55} />
          </mesh>
          <mesh position={[0, 2.55, 0]}>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial
              color="#ffd18a"
              emissive="#ff9f43"
              emissiveIntensity={2.2}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 2.38, 0]}>
            <cylinderGeometry args={[0.2, 0.12, 0.2, 8, 1, true]} />
            <meshStandardMaterial color="#60452c" metalness={0.35} roughness={0.65} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  );
}
