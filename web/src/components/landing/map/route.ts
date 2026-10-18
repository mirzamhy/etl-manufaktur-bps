import * as THREE from 'three'

// Proyeksi sama dengan scripts/build-geo.mjs: x = bujur − 118, z = −(lintang + 2,5).
const LON0 = 118, LAT0 = -2.5

export function routeCurve(points: [number, number][], y = 0) {
  return new THREE.CatmullRomCurve3(points.map(([lon, lat]) => new THREE.Vector3(lon - LON0, y, -(lat - LAT0))))
}

const tangent = new THREE.Vector3()

/**
 * Letakkan objek di jalur dan hadapkan ke arah gerak; bolak-balik 0→1→0.
 * Tanpa animasi, objek diam di posisi `offset` sepanjang jalur.
 */
export function followCurve(obj: THREE.Object3D, curve: THREE.CatmullRomCurve3, length: number, opts: {
  time: number; speed: number; offset: number; animate: boolean; y: number
}) {
  const cycle = opts.animate ? (opts.time * opts.speed) / length + opts.offset : opts.offset
  const phase = ((cycle % 2) + 2) % 2
  const forward = phase < 1
  const u = THREE.MathUtils.clamp(forward ? phase : 2 - phase, 0.001, 0.999)
  curve.getPointAt(u, obj.position)
  curve.getTangentAt(u, tangent)
  if (!forward) tangent.negate()
  obj.position.y = opts.y
  obj.rotation.set(0, Math.atan2(-tangent.z, tangent.x), 0)
}
