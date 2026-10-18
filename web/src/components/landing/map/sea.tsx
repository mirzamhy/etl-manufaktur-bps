'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Riak halus dari dua gelombang sinus yang bergeser, tepi memudar agar bidang tidak tampak kotak.
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uRipple;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * vec2(70.0, 40.0);
    // Garis ombak pendek: memanjang ke arah timur-barat, terputus oleh gelombang kedua yang lebih lambat.
    float crest = sin(p.y * 6.0 + sin(p.x * 0.8 + uTime * 0.3) * 2.0 + uTime * 0.9);
    float breakup = sin(p.x * 1.1 - uTime * 0.4) * sin(p.y * 1.3 + p.x * 0.5 + uTime * 0.2);
    float ripple = smoothstep(0.92, 1.0, crest) * smoothstep(0.2, 0.7, breakup);
    vec2 c = vUv - 0.5;
    float fade = 1.0 - smoothstep(0.30, 0.5, length(c * vec2(1.0, 1.6)));
    gl_FragColor = vec4(mix(uColor, uRipple, ripple * 0.5), fade);
  }
`

export function Sea({ color, ripple, animate }: { color: string; ripple: string; animate: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color() },
    uRipple: { value: new THREE.Color() },
    uTime: { value: 0 },
  }), [])
  uniforms.uColor.value.set(color)
  uniforms.uRipple.value.set(ripple)
  useFrame((_, dt) => {
    if (animate && material.current) material.current.uniforms.uTime.value += dt
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position={[1.5, -0.03, 0]} raycast={() => null} renderOrder={-1}>
      <planeGeometry args={[70, 40]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment}
        transparent depthWrite={false} />
    </mesh>
  )
}
