'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { followCurve, routeCurve } from './route'

// Jalan utama (bujur, lintang) antarkota industri.
const ROADS: { name: string; points: [number, number][]; trucks: number }[] = [
  {
    name: 'Pantura Jawa',
    points: [[106.05, -6.05], [106.85, -6.25], [107.6, -6.45], [108.55, -6.78], [109.6, -6.92], [110.42, -7.02],
      [111.4, -6.95], [112.6, -7.3], [113.4, -7.75], [114.3, -8.15]],
    trucks: 3,
  },
  {
    name: 'Trans-Sumatera',
    points: [[105.6, -5.75], [105.25, -5.35], [104.95, -4.3], [104.75, -3.05], [103.95, -2.15], [103.55, -1.65],
      [102.6, -0.6], [101.45, 0.5], [100.5, 1.6], [99.6, 2.6], [98.7, 3.5]],
    trucks: 3,
  },
]
const LAND_TOP = 0.22 // sama dengan ketebalan daratan di indonesia-map.tsx
const SPEED = 0.35
const CARGO_COLORS = ['#f4f3ef', '#eda100', '#e2683a', '#1baf7a', '#f4f3ef', '#2a78d6']

function Truck({ curve, length, offset, animate, cab, cargo }: {
  curve: THREE.CatmullRomCurve3; length: number; offset: number; animate: boolean; cab: string; cargo: string
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) followCurve(ref.current, curve, length, { time: clock.elapsedTime, speed: SPEED, offset, animate, y: LAND_TOP + 0.012 })
  })
  return (
    <group ref={ref} scale={1.6} raycast={() => null}>
      {/* bak muatan */}
      <mesh position={[-0.04, 0.055, 0]} castShadow raycast={() => null}>
        <boxGeometry args={[0.2, 0.09, 0.09]} />
        <meshStandardMaterial color={cargo} roughness={0.6} />
      </mesh>
      {/* kabin */}
      <mesh position={[0.1, 0.04, 0]} castShadow raycast={() => null}>
        <boxGeometry args={[0.07, 0.07, 0.085]} />
        <meshStandardMaterial color={cab} roughness={0.5} />
      </mesh>
      {/* kaca depan */}
      <mesh position={[0.136, 0.05, 0]} raycast={() => null}>
        <boxGeometry args={[0.004, 0.03, 0.07]} />
        <meshStandardMaterial color="#1b2430" roughness={0.2} />
      </mesh>
    </group>
  )
}

export function Trucks({ animate, road, cab }: { animate: boolean; road: string; cab: string }) {
  const routes = useMemo(() => ROADS.map((r) => {
    const curve = routeCurve(r.points, LAND_TOP + 0.004)
    return { ...r, curve, length: curve.getLength(), tube: new THREE.TubeGeometry(curve, 160, 0.045, 4, false) }
  }), [])
  useEffect(() => () => routes.forEach((r) => r.tube.dispose()), [routes])
  return (
    <group>
      {routes.map((r, ri) => (
        <group key={r.name}>
          <mesh geometry={r.tube} raycast={() => null} receiveShadow>
            <meshStandardMaterial color={road} roughness={0.9} />
          </mesh>
          {Array.from({ length: r.trucks }, (_, i) => (
            <Truck key={i} curve={r.curve} length={r.length} offset={animate ? i * 0.66 : (i + 0.5) / r.trucks}
              animate={animate} cab={cab} cargo={CARGO_COLORS[(ri * 3 + i) % CARGO_COLORS.length]} />
          ))}
        </group>
      ))}
    </group>
  )
}
