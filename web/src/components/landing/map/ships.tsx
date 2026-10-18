'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

// Jalur pelayaran (bujur, lintang) antarpelabuhan besar, lewat laut.
const ROUTES: { name: string; points: [number, number][] }[] = [
  { name: 'Belawan – Batam', points: [[98.9, 3.9], [100.4, 2.9], [102.2, 1.9], [103.9, 1.2]] },
  { name: 'Tanjung Priok – Tanjung Perak', points: [[106.9, -5.8], [108.6, -5.5], [110.6, -5.7], [112.75, -6.85]] },
  { name: 'Tanjung Perak – Makassar', points: [[113.0, -6.85], [115.4, -6.2], [117.8, -5.7], [119.3, -5.2]] },
  { name: 'Makassar – Balikpapan', points: [[119.1, -4.9], [118.7, -3.6], [117.9, -2.3], [117.1, -1.4]] },
  { name: 'Tanjung Priok – Batam', points: [[106.8, -5.7], [106.3, -4.2], [105.3, -2.4], [104.9, -0.6], [104.2, 0.9]] },
  { name: 'Makassar – Ambon', points: [[119.4, -5.4], [122.2, -5.6], [125.2, -5.0], [128.0, -3.8]] },
]
const LON0 = 118, LAT0 = -2.5
const SPEED = 0.55 // satuan scene per detik
const WATER_Y = 0.02

const CONTAINER_COLORS = ['#e2683a', '#2a78d6', '#1baf7a', '#eda100', '#c94f4f', '#6250d6']

function Ship({ curve, offset, animate, hull }: { curve: THREE.CatmullRomCurve3; offset: number; animate: boolean; hull: string }) {
  const ref = useRef<THREE.Group>(null)
  const length = useMemo(() => curve.getLength(), [curve])
  const tangent = useMemo(() => new THREE.Vector3(), [])
  const point = useMemo(() => new THREE.Vector3(), [])
  const colors = useMemo(() => [0, 1, 2, 3].map((i) => CONTAINER_COLORS[(i + offset * 3) % CONTAINER_COLORS.length]), [offset])

  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = animate ? clock.elapsedTime : 0
    // Bolak-balik di sepanjang jalur: 0→1 lalu 1→0.
    const cycle = (t * SPEED) / length + offset * 0.37 + (animate ? 0 : 0.5)
    const phase = cycle % 2
    const forward = phase < 1
    const u = forward ? phase : 2 - phase
    curve.getPointAt(Math.min(0.999, Math.max(0.001, u)), point)
    curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)), tangent)
    if (!forward) tangent.negate()
    g.position.set(point.x, WATER_Y + (animate ? Math.sin(t * 2 + offset) * 0.012 : 0), point.z)
    g.rotation.set(0, Math.atan2(-tangent.z, tangent.x), animate ? Math.sin(t * 1.6 + offset) * 0.04 : 0)
  })

  return (
    <group ref={ref} scale={1.7} raycast={() => null}>
      {/* lambung */}
      <mesh position={[0, 0.05, 0]} castShadow raycast={() => null}>
        <boxGeometry args={[0.62, 0.1, 0.16]} />
        <meshStandardMaterial color={hull} roughness={0.7} />
      </mesh>
      {/* haluan runcing */}
      <mesh position={[0.36, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]} raycast={() => null}>
        <coneGeometry args={[0.08, 0.12, 4]} />
        <meshStandardMaterial color={hull} roughness={0.7} />
      </mesh>
      {/* tumpukan kontainer */}
      {colors.map((c, i) => (
        <mesh key={i} position={[0.17 - i * 0.11, 0.135, 0]} castShadow raycast={() => null}>
          <boxGeometry args={[0.095, 0.07, 0.13]} />
          <meshStandardMaterial color={c} roughness={0.6} />
        </mesh>
      ))}
      {/* anjungan di buritan */}
      <mesh position={[-0.25, 0.16, 0]} castShadow raycast={() => null}>
        <boxGeometry args={[0.08, 0.12, 0.12]} />
        <meshStandardMaterial color="#f4f3ef" roughness={0.5} />
      </mesh>
      {/* jejak buih */}
      <mesh position={[-0.62, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[0.55, 0.12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function Ships({ animate, count, hull }: { animate: boolean; count: number; hull: string }) {
  const curves = useMemo(
    () => ROUTES.map((r) => new THREE.CatmullRomCurve3(r.points.map(([lon, lat]) => new THREE.Vector3(lon - LON0, 0, -(lat - LAT0))))),
    [],
  )
  return (
    <group>
      {curves.slice(0, count).map((c, i) => <Ship key={ROUTES[i].name} curve={c} offset={i} animate={animate} hull={hull} />)}
    </group>
  )
}
