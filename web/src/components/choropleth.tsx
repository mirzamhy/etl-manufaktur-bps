'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { titleCase } from '@/lib/metrics'

type Province = { kode: string; nama: string; center: [number, number]; rings: [number, number][][] }
type GeoFile = { attribution: string; provinces: Province[] }

let geoCache: Promise<GeoFile> | null = null
const loadGeo = () => (geoCache ??= fetch('/geo/provinsi.json').then((r) => r.json()))

// Kelas ditulis utuh agar Tailwind membuatnya; warnanya dari --color-seq-* di globals.css.
const STEPS = [
  { fill: 'fill-seq-1', bg: 'bg-seq-1' },
  { fill: 'fill-seq-2', bg: 'bg-seq-2' },
  { fill: 'fill-seq-3', bg: 'bg-seq-3' },
  { fill: 'fill-seq-4', bg: 'bg-seq-4' },
  { fill: 'fill-seq-5', bg: 'bg-seq-5' },
]

/** Batas kelas kuantil: tiap warna berisi jumlah provinsi yang kurang lebih sama. */
function quantileBreaks(values: number[]) {
  const s = [...values].sort((a, b) => a - b)
  return [0.2, 0.4, 0.6, 0.8].map((q) => s[Math.min(s.length - 1, Math.floor(q * s.length))])
}

type Props = {
  /** kode BPS → nilai; null = belum dilaporkan terpisah */
  values: Record<string, number | null>
  selected?: string | null
  onSelect?: (kode: string) => void
  format: (v: number) => string
  label: string
}

export function Choropleth({ values, selected, onSelect, format, label }: Props) {
  const [geo, setGeo] = useState<GeoFile | null>(null)
  const [hover, setHover] = useState<{ kode: string; x: number; y: number; w: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { loadGeo().then(setGeo) }, [])

  const nums = useMemo(() => Object.values(values).filter((v): v is number => v != null), [values])
  const breaks = useMemo(() => quantileBreaks(nums), [nums])
  const rank = useMemo(
    () => Object.entries(values).filter(([, v]) => v != null).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).map(([k]) => k),
    [values],
  )
  const classOf = (v: number | null | undefined) => {
    if (v == null) return 'fill-surface-2'
    const i = breaks.findIndex((b) => v < b)
    return STEPS.at(i === -1 ? 4 : i)!.fill
  }
  const paths = useMemo(() => geo?.provinces.map((p) => ({
    ...p,
    d: p.rings.map((r) => `M${r.map(([x, y]) => `${x},${-y}`).join('L')}Z`).join(''),
  })) ?? [], [geo])

  if (!geo) return <div className="h-[300px] animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />

  const move = (kode: string) => (e: React.MouseEvent) => {
    const r = box.current!.getBoundingClientRect()
    setHover({ kode, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width })
  }
  const hv = hover ? values[hover.kode] : null
  const lo = Math.min(...nums), hi = Math.max(...nums)
  const legend = [lo, ...breaks].map((from, i) => ({ from, to: [...breaks, hi].at(i)!, bg: STEPS.at(i)!.bg }))

  return (
    <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox="-23.6 -9.2 48.2 18.6" className="h-auto w-full" role="img" aria-label={`Peta ${label} per provinsi`}>
        {paths.map((p) => (
          <path
            key={p.kode}
            d={p.d}
            stroke={p.kode === selected ? 'var(--ink)' : 'var(--surface)'}
            strokeWidth={p.kode === selected ? 0.12 : 0.05}
            strokeLinejoin="round"
            className={`${classOf(values[p.kode])} ${onSelect ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
            onMouseMove={move(p.kode)}
            onClick={() => onSelect?.(p.kode)}
          />
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-60 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-lg"
          style={{ left: Math.min(hover.x + 14, hover.w - 200), top: hover.y + 14 }}
        >
          <div className="font-semibold">{titleCase(geo.provinces.find((p) => p.kode === hover.kode)?.nama ?? hover.kode)}</div>
          {hv == null
            ? <div className="text-ink-3">Belum dilaporkan terpisah</div>
            : <div className="text-ink-2">{label}: <b className="text-ink">{format(hv)}</b> · peringkat {rank.indexOf(hover.kode) + 1}</div>}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-3" aria-label="Legenda warna">
        {legend.map((l) => (
          <span key={l.bg} className="inline-flex items-center gap-1.5">
            <span className={`size-3 rounded-sm ${l.bg}`} />
            <span className="tabular">{format(l.from)} – {format(l.to)}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm border border-line bg-surface-2" />belum terpisah</span>
      </div>
    </div>
  )
}
