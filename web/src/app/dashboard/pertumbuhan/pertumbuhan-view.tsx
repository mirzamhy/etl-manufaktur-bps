'use client'

import { useMemo, useState } from 'react'
import { axis, baseOption, Chart } from '@/components/chart'
import { Segmented, Select } from '@/components/controls'
import { Card, Insights, PageHead } from '@/components/ui'
import { aggregate, fmtDec, fmtMetric, fmtPct, groupBy, METRIC, reported, titleCase, years } from '@/lib/metrics'
import type { Metric, Row } from '@/lib/types'

const METRICS = (Object.keys(METRIC) as Metric[]).map((k) => ({ value: k, label: METRIC[k].label }))
// Provinsi induk sebelum pemekaran Papua (2022): sampai 2023 angkanya masih mencakup wilayah baru.
const INDUK_PAPUA = new Set(['9100', '9400'])
const LAST_GABUNG = 2023

export function PertumbuhanView({ rows }: { rows: Row[] }) {
  const allYears = useMemo(() => years(rows), [rows])
  const [metric, setMetric] = useState<Metric>('nilai_output')
  const [dari, setDari] = useState(allYears[0])
  const [sampai, setSampai] = useState(allYears.at(-1)!)
  const from = Math.min(dari, sampai), to = Math.max(dari, sampai)
  const m = METRIC[metric]

  const byProv = useMemo(() => groupBy(rows.filter((r) => !r.nasional), (r) => r.provinsi), [rows])
  const valueAt = (list: Row[], y: number) => {
    const sel = list.filter((r) => r.tahun === y)
    return reported(sel) ? aggregate(sel)[metric] : null
  }

  // Perubahan persen per provinsi; provinsi tanpa data di tahun awal (pemekaran Papua) dilewati.
  const cakupanBerubah = from <= LAST_GABUNG && to > LAST_GABUNG
  const changes = useMemo(() => [...byProv]
    .filter(([, list]) => !(cakupanBerubah && INDUK_PAPUA.has(list[0].kode)))
    .map(([provinsi, list]) => {
    const a = valueAt(list, from), b = valueAt(list, to)
    return { provinsi, a, b, pct: a && b != null ? ((b - a) / a) * 100 : null }
  }).filter((d): d is { provinsi: string; a: number; b: number; pct: number } => d.pct != null)
    .sort((x, y) => y.pct - x.pct),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [byProv, from, to, metric, cakupanBerubah])

  const nat = (y: number) => aggregate(rows.filter((r) => r.nasional && r.tahun === y))[metric]
  const natPct = (() => { const a = nat(from), b = nat(to); return a && b != null ? ((b - a) / a) * 100 : null })()
  const span = allYears.filter((y) => y >= from && y <= to)
  const top5 = changes.slice(0, 5)
  const index = [
    { name: 'Indonesia', values: span.map((y) => { const a = nat(from); const v = nat(y); return a && v != null ? (v / a) * 100 : null }) },
    ...top5.map((d) => ({
      name: titleCase(d.provinsi),
      values: span.map((y) => { const v = valueAt(byProv.get(d.provinsi)!, y); return v != null ? (v / d.a) * 100 : null }),
    })),
  ]

  const up = changes.filter((d) => d.pct > 0).length
  const faster = natPct == null ? 0 : changes.filter((d) => d.pct > natPct).length
  const insights = changes.length ? [
    <>Secara nasional {m.label.toLowerCase()} berubah <b className="text-ink">{fmtPct(natPct)}</b> dari {from} ke {to}; {faster} dari {changes.length} provinsi tumbuh lebih cepat dari angka nasional.</>,
    <><b className="text-ink">{titleCase(changes[0].provinsi)}</b> tumbuh paling cepat ({fmtPct(changes[0].pct)}, dari {fmtMetric(metric, changes[0].a)} menjadi {fmtMetric(metric, changes[0].b)}), disusul {changes.slice(1, 3).map((d) => `${titleCase(d.provinsi)} (${fmtPct(d.pct)})`).join(' dan ')}.</>,
    up < changes.length
      ? <>{changes.length - up} provinsi turun; penurunan terdalam di {titleCase(changes.at(-1)!.provinsi)} ({fmtPct(changes.at(-1)!.pct)}).</>
      : <>Semua {changes.length} provinsi naik pada periode ini.</>,
    m.money ? <>Angka uang bersifat nominal: sebagian kenaikan mencerminkan inflasi, bukan hanya volume produksi.</> : <>Provinsi pemekaran Papua tidak dihitung bila belum dilaporkan terpisah pada tahun awal.</>,
    ...(cakupanBerubah ? [<>Papua dan Papua Barat tidak dibandingkan: sampai {LAST_GABUNG} angkanya masih mencakup wilayah pemekaran, sehingga akan tampak turun padahal cakupannya yang menyempit.</>] : []),
  ] : []

  return (
    <>
      <PageHead title="Pertumbuhan" desc="Perubahan setiap provinsi antara dua tahun, dan lintasan provinsi yang tumbuh paling cepat dibanding nasional.">
        <Select label="Indikator" value={metric} options={METRICS} onChange={setMetric} />
        <Segmented label="Dari" value={dari} options={allYears} onChange={setDari} />
        <Segmented label="Sampai" value={sampai} options={allYears} onChange={setSampai} />
      </PageHead>

      {from === to ? (
        <Card><p className="text-sm text-ink-2">Pilih dua tahun yang berbeda untuk melihat perubahan.</p></Card>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
            <Card
              title={`${up} dari ${changes.length} provinsi naik; ${titleCase(changes[0]?.provinsi ?? '')} tercepat ${fmtPct(changes[0]?.pct)}`}
              desc={`Perubahan ${m.label.toLowerCase()} ${from}→${to} · garis putus-putus = nasional ${fmtPct(natPct)}`}
            >
              <Chart
                ariaLabel={`Grafik perubahan ${m.label} per provinsi ${from} sampai ${to}`}
                height={Math.max(420, changes.length * 22 + 40)}
                deps={[changes, natPct]}
                build={(t) => {
                  const list = [...changes].reverse()
                  return {
                    ...baseOption(t),
                    legend: { show: false },
                    tooltip: { ...baseOption(t).tooltip, trigger: 'item', formatter: (p: { dataIndex: number }) => {
                      const d = list.at(p.dataIndex)!
                      return `<b>${titleCase(d.provinsi)}</b><br>${from}: ${fmtMetric(metric, d.a)}<br>${to}: ${fmtMetric(metric, d.b)}<br>Perubahan <b>${fmtPct(d.pct)}</b>`
                    } },
                    grid: { left: 8, right: 64, top: 26, bottom: 4, containLabel: true },
                    xAxis: { type: 'value', ...axis(t), axisLabel: { color: t.ink3, formatter: (v: number) => `${fmtDec(v, 0)}%` } },
                    yAxis: { type: 'category', data: list.map((d) => titleCase(d.provinsi)), ...axis(t), axisLabel: { color: t.ink2, fontSize: 12 } },
                    series: [{
                      type: 'bar', barMaxWidth: 14,
                      data: list.map((d) => ({ value: d.pct, itemStyle: { color: d.pct >= 0 ? t.series[0] : t.neg, borderRadius: d.pct >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] } })),
                      label: { show: true, position: 'right', color: t.ink2, fontSize: 11, formatter: (p: { value: number }) => fmtPct(p.value, 0) },
                      markLine: natPct == null ? undefined : {
                        silent: true, symbol: 'none', animation: false,
                        lineStyle: { color: t.ink3, type: 'dashed', width: 1 },
                        label: { formatter: `nasional ${fmtPct(natPct, 0)}`, position: 'end', color: t.ink2, fontSize: 11 },
                        data: [{ xAxis: natPct }],
                      },
                    }],
                  }
                }}
              />
            </Card>
            <div className="flex flex-col gap-4">
              <Card title={`Lima provinsi tercepat vs nasional`} desc={`Indeks ${m.label.toLowerCase()}, ${from} = 100`}>
                <Chart
                  ariaLabel={`Grafik indeks ${m.label} lima provinsi tercepat dibanding nasional`}
                  height={320}
                  deps={[index]}
                  build={(t) => ({
                    ...baseOption(t),
                    tooltip: { ...baseOption(t).tooltip, trigger: 'axis', valueFormatter: (v: number) => fmtDec(v, 0),
                      axisPointer: { type: 'line', lineStyle: { color: t.ink3, type: 'dashed' } } },
                    grid: { left: 8, right: 16, top: 64, bottom: 8, containLabel: true },
                    xAxis: { type: 'category', data: span, boundaryGap: false, ...axis(t), splitLine: { show: false } },
                    yAxis: { type: 'value', ...axis(t), axisLabel: { color: t.ink3 } },
                    series: index.map((s, i) => ({
                      name: s.name, type: 'line', data: s.values, symbol: 'circle', symbolSize: i === 0 ? 8 : 6,
                      lineStyle: { width: i === 0 ? 2.5 : 2, color: i === 0 ? t.ink : t.series.at(i - 1), type: i === 0 ? 'solid' : 'solid' },
                      itemStyle: { color: i === 0 ? t.ink : t.series.at(i - 1), borderColor: t.surface, borderWidth: 1.5 },
                      emphasis: { focus: 'series' }, z: i === 0 ? 10 : 2,
                    })),
                  })}
                />
              </Card>
              <Insights items={insights} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
