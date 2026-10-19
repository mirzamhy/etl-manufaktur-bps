'use client'

import { useMemo, useState } from 'react'
import { axis, baseOption, Chart } from '@/components/chart'
import { Segmented } from '@/components/controls'
import { Card, Insights, PageHead } from '@/components/ui'
import { aggregate, bySkala, fmtCompact, fmtDec, fmtInt, groupBy, reported, type SkalaFilter, titleCase, years } from '@/lib/metrics'
import type { Row } from '@/lib/types'

const SKALA: readonly SkalaFilter[] = ['Semua', 'Mikro', 'Kecil']

const QUADRANTS = [
  { key: 'besar-produktif', name: 'Besar dan produktif', desc: 'tenaga kerja dan output per pekerja di atas rata-rata' },
  { key: 'kecil-produktif', name: 'Kecil tapi produktif', desc: 'pekerja sedikit, output per pekerja tinggi' },
  { key: 'padat-karya', name: 'Besar, padat karya', desc: 'banyak pekerja, output per pekerja di bawah rata-rata' },
  { key: 'tertinggal', name: 'Kecil dan kurang produktif', desc: 'keduanya di bawah rata-rata' },
] as const
type QuadrantKey = (typeof QUADRANTS)[number]['key']

export function ProduktivitasView({ rows }: { rows: Row[] }) {
  const allYears = useMemo(() => years(rows), [rows])
  const [tahun, setTahun] = useState(allYears.at(-1)!)
  const [skala, setSkala] = useState<SkalaFilter>('Semua')

  const points = useMemo(() => {
    const g = groupBy(rows.filter((r) => !r.nasional && r.tahun === tahun && bySkala(skala)(r)), (r) => r.provinsi)
    return [...g].filter(([, list]) => reported(list)).map(([provinsi, list]) => ({ provinsi, ...aggregate(list) }))
      .filter((d) => d.tenaga_kerja > 0 && d.output_per_tk != null)
  }, [rows, tahun, skala])

  // Pembagi kuadran: rata-rata tenaga kerja per provinsi, dan output per pekerja nasional (total ÷ total).
  const xMid = points.reduce((s, d) => s + d.tenaga_kerja, 0) / Math.max(1, points.length)
  const yMid = aggregate(rows.filter((r) => !r.nasional && r.tahun === tahun && bySkala(skala)(r) && points.some((p) => p.provinsi === r.provinsi))).output_per_tk ?? 0
  const quadrantOf = (d: (typeof points)[number]): QuadrantKey =>
    d.tenaga_kerja >= xMid ? ((d.output_per_tk ?? 0) >= yMid ? 'besar-produktif' : 'padat-karya')
      : ((d.output_per_tk ?? 0) >= yMid ? 'kecil-produktif' : 'tertinggal')
  const groups = QUADRANTS.map((q) => ({ ...q, list: points.filter((d) => quadrantOf(d) === q.key).sort((a, b) => b.nilai_output - a.nilai_output) }))

  // Label hanya untuk titik yang menonjol agar grafik tetap terbaca.
  const labelled = useMemo(() => {
    const byTk = [...points].sort((a, b) => b.tenaga_kerja - a.tenaga_kerja).slice(0, 3)
    const byProd = [...points].sort((a, b) => (b.output_per_tk ?? 0) - (a.output_per_tk ?? 0))
    return new Set([...byTk, ...byProd.slice(0, 3), ...byProd.slice(-2)].map((d) => d.provinsi))
  }, [points])
  const maxUsaha = Math.max(1, ...points.map((d) => d.jumlah_perusahaan))

  const best = [...points].sort((a, b) => (b.output_per_tk ?? 0) - (a.output_per_tk ?? 0))
  const padat = groups.find((g) => g.key === 'padat-karya')!.list
  const unggul = groups.find((g) => g.key === 'besar-produktif')!.list
  const insights = points.length ? [
    <>Rata-rata nasional {fmtDec(yMid)} juta Rp per pekerja. <b className="text-ink">{titleCase(best[0].provinsi)}</b> tertinggi ({fmtDec(best[0].output_per_tk)} juta), {titleCase(best.at(-1)!.provinsi)} terendah ({fmtDec(best.at(-1)!.output_per_tk)} juta), selisih {fmtDec((best[0].output_per_tk ?? 0) / (best.at(-1)!.output_per_tk || 1))} kali.</>,
    unggul.length
      ? <>Hanya {unggul.length} provinsi yang besar sekaligus produktif: <b className="text-ink">{unggul.map((d) => titleCase(d.provinsi)).join(', ')}</b>.</>
      : <>Tidak ada provinsi yang besar sekaligus di atas rata-rata produktivitas.</>,
    padat.length
      ? <>{padat.map((d) => titleCase(d.provinsi)).join(', ')} menyerap banyak pekerja tetapi output per pekerjanya di bawah rata-rata: kandidat utama peningkatan teknologi dan pelatihan.</>
      : <>Tidak ada provinsi padat karya dengan produktivitas di bawah rata-rata.</>,
    <>Ukuran titik menunjukkan jumlah unit usaha. Nilai output bersifat nominal; produktivitas wilayah dengan sedikit usaha mudah berfluktuasi.</>,
  ] : []

  return (
    <>
      <PageHead title="Produktivitas provinsi" desc="Setiap titik adalah satu provinsi: makin ke kanan makin banyak pekerja, makin ke atas makin besar output per pekerja. Garis putus-putus membagi empat kelompok.">
        <Segmented label="Tahun" value={tahun} options={allYears} onChange={setTahun} />
        <Segmented label="Skala usaha" value={skala} options={SKALA} onChange={setSkala} />
      </PageHead>

      <Card
        title={unggul.length ? `${unggul.length} provinsi besar sekaligus produktif; ${padat.length} padat karya di bawah rata-rata` : 'Skala dan produktivitas tenaga kerja per provinsi'}
        desc={`Tenaga kerja (skala log) vs output per pekerja, ${tahun} · ukuran titik = jumlah usaha`}
      >
        <Chart
          ariaLabel={`Scatter tenaga kerja dan output per pekerja per provinsi tahun ${tahun}`}
          height={480}
          deps={[points, xMid, yMid]}
          build={(t) => ({
            ...baseOption(t),
            legend: { show: false },
            tooltip: { ...baseOption(t).tooltip, trigger: 'item', formatter: (p: { dataIndex: number }) => {
              const d = points.at(p.dataIndex)!
              return `<b>${titleCase(d.provinsi)}</b><br>Tenaga kerja ${fmtInt(d.tenaga_kerja)} orang<br>Output per pekerja ${fmtDec(d.output_per_tk)} jt Rp<br>Jumlah usaha ${fmtInt(d.jumlah_perusahaan)}`
            } },
            grid: { left: 12, right: 32, top: 32, bottom: 40, containLabel: true },
            xAxis: { type: 'log', name: 'Tenaga kerja (orang)', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: t.ink3, fontSize: 12 },
              ...axis(t), axisLabel: { color: t.ink3, formatter: (v: number) => fmtCompact(v) } },
            yAxis: { type: 'value', name: 'Output per pekerja (juta Rp)', nameTextStyle: { color: t.ink3, fontSize: 12, align: 'left' },
              ...axis(t), axisLabel: { color: t.ink3 } },
            series: [{
              type: 'scatter',
              data: points.map((d) => ({
                value: [d.tenaga_kerja, d.output_per_tk],
                symbolSize: 8 + 30 * Math.sqrt(d.jumlah_perusahaan / maxUsaha),
                label: { show: labelled.has(d.provinsi), formatter: titleCase(d.provinsi), position: 'right', color: t.ink2, fontSize: 11 },
              })),
              itemStyle: { color: t.series[0], opacity: 0.75, borderColor: t.surface, borderWidth: 1.5 },
              emphasis: { itemStyle: { opacity: 1 } },
              labelLayout: { hideOverlap: true },
              markLine: {
                silent: true, symbol: 'none', animation: false,
                lineStyle: { color: t.ink3, type: 'dashed', width: 1 },
                label: { color: t.ink3, fontSize: 11 },
                data: [
                  { xAxis: xMid, label: { formatter: `rata-rata ${fmtCompact(xMid)} pekerja`, position: 'end' } },
                  { yAxis: yMid, label: { formatter: `nasional ${fmtDec(yMid)} jt`, position: 'insideEndTop' } },
                ],
              },
            }],
          })}
        />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="Empat kelompok provinsi" desc="Diurutkan menurut nilai output terbesar">
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g.key} className="rounded-lg border border-line p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{g.name}</h3>
                  <span className="tabular text-xs text-ink-3">{g.list.length} provinsi</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-3">{g.desc}</p>
                <p className="mt-2 text-[13px] text-ink-2">{g.list.length ? g.list.map((d) => titleCase(d.provinsi)).join(', ') : '–'}</p>
              </div>
            ))}
          </div>
        </Card>
        <Insights items={insights} />
      </div>
    </>
  )
}
