'use client'

import { useMemo, useState } from 'react'
import { axis, baseOption, Chart } from '@/components/chart'
import { Segmented } from '@/components/controls'
import { Card, Insights, PageHead } from '@/components/ui'
import { aggregate, type Agg, fmtDec, fmtPct, groupBy, reported, titleCase, years } from '@/lib/metrics'
import type { Row, Skala } from '@/lib/types'

const PARTS = ['Bahan baku & input', 'Upah pekerja', 'Sisa untuk pemilik usaha'] as const

/** Pembagian output: input + upah + sisa (nilai tambah dikurangi upah). */
function split(a: Agg) {
  const out = a.nilai_output || 1
  const input = (a.nilai_input / out) * 100
  const upah = (a.pengeluaran_tk / out) * 100
  return [input, upah, Math.max(0, 100 - input - upah)]
}
/** Upah rata-rata per pekerja per bulan, dalam rupiah. */
const upahBulan = (a: Agg) => (a.tenaga_kerja ? (a.pengeluaran_tk * 1e6) / a.tenaga_kerja / 12 : null)
const fmtRb = (v: number | null | undefined) => (v == null ? '–' : v >= 1e6 ? `Rp${fmtDec(v / 1e6, 2)} jt` : `Rp${fmtDec(v / 1e3, 0)} rb`)

export function BiayaView({ rows }: { rows: Row[] }) {
  const allYears = useMemo(() => years(rows), [rows])
  const [tahun, setTahun] = useState(allYears.at(-1)!)
  const [skala, setSkala] = useState<Skala>('Mikro')

  const nat = (y: number, s?: Skala) => aggregate(rows.filter((r) => r.nasional && r.tahun === y && (!s || r.skala === s)))
  const mik = nat(tahun, 'Mikro'), kec = nat(tahun, 'Kecil'), all = nat(tahun)
  const bars = [{ name: 'Usaha mikro', a: mik }, { name: 'Usaha kecil', a: kec }, { name: 'Semua', a: all }]
  const trend = allYears.map((y) => ({ tahun: y, Mikro: upahBulan(nat(y, 'Mikro')), Kecil: upahBulan(nat(y, 'Kecil')) }))

  const prov = useMemo(() => {
    const g = groupBy(rows.filter((r) => !r.nasional && r.tahun === tahun && r.skala === skala), (r) => r.provinsi)
    return [...g].filter(([, list]) => reported(list)).map(([provinsi, list]) => {
      const a = aggregate(list)
      return { provinsi, upah: upahBulan(a), porsi: a.nilai_tambah ? (a.pengeluaran_tk / a.nilai_tambah) * 100 : null }
    }).filter((d) => d.upah != null).sort((x, y) => (y.upah ?? 0) - (x.upah ?? 0))
  }, [rows, tahun, skala])
  const natUpah = upahBulan(skala === 'Mikro' ? mik : kec)

  const [, upahMik] = split(mik), [, upahKec] = split(kec)
  const shareMik = mik.nilai_tambah ? (mik.pengeluaran_tk / mik.nilai_tambah) * 100 : null
  const shareKec = kec.nilai_tambah ? (kec.pengeluaran_tk / kec.nilai_tambah) * 100 : null
  const ratio = (upahBulan(kec) ?? 0) / (upahBulan(mik) || 1)
  const insights = [
    <>Dari setiap Rp100 output usaha mikro, sekitar <b className="text-ink">Rp{fmtDec(upahMik, 0)}</b> menjadi upah pekerja; di usaha kecil Rp{fmtDec(upahKec, 0)}. Porsi bahan baku hampir sama di kedua skala (sekitar Rp{fmtDec(split(all)[0], 0)}).</>,
    <>Pekerja usaha mikro menerima <b className="text-ink">{fmtPct(shareMik, 0)}</b> dari nilai tambah, pekerja usaha kecil {fmtPct(shareKec, 0)}. Sisanya dinikmati pemilik usaha.</>,
    <>Upah rata-rata pekerja usaha mikro <b className="text-ink">{fmtRb(upahBulan(mik))} per bulan</b>, usaha kecil {fmtRb(upahBulan(kec))} ({fmtDec(ratio)} kali). Angka rendah di usaha mikro wajar karena banyak pekerjanya pemilik atau keluarga yang tidak digaji penuh.</>,
    prov.length ? <>Untuk usaha {skala.toLowerCase()}, upah tertinggi di {titleCase(prov[0].provinsi)} ({fmtRb(prov[0].upah)}/bulan) dan terendah di {titleCase(prov.at(-1)!.provinsi)} ({fmtRb(prov.at(-1)!.upah)}/bulan).</> : null,
  ].filter(Boolean)

  return (
    <>
      <PageHead title="Struktur biaya dan upah" desc="Ke mana nilai produksi mengalir: bahan baku, upah pekerja, atau sisa untuk pemilik usaha, beserta upah rata-rata per pekerja.">
        <Segmented label="Tahun" value={tahun} options={allYears} onChange={setTahun} />
      </PageHead>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card title={`Dari setiap Rp100 output usaha mikro, Rp${fmtDec(upahMik, 0)} menjadi upah pekerja`} desc={`Pembagian nilai output nasional, ${tahun}`}>
          <Chart
            ariaLabel={`Grafik batang bertumpuk pembagian output tahun ${tahun}`}
            height={250}
            deps={[tahun]}
            build={(t) => {
              const list = [...bars].reverse()
              return {
                ...baseOption(t),
                tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `Rp${fmtDec(v, 1)} dari Rp100` },
                grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
                xAxis: { type: 'value', max: 100, ...axis(t), axisLabel: { color: t.ink3, formatter: '{value}%' } },
                yAxis: { type: 'category', data: list.map((b) => b.name), ...axis(t), axisLabel: { color: t.ink2, fontSize: 12 } },
                series: PARTS.map((name, i) => ({
                  name, type: 'bar', stack: 'total', barMaxWidth: 30,
                  data: list.map((b) => split(b.a).at(i)),
                  itemStyle: { color: t.series.at(i), borderColor: t.surface, borderWidth: 2 },
                  label: { show: true, color: '#fff', fontSize: 12, fontWeight: 600, formatter: (p: { value: number }) => (p.value >= 4 ? `${Math.round(p.value)}%` : '') },
                })),
              }
            }}
          />
        </Card>
        <Card title={`Upah pekerja usaha kecil ${fmtDec(ratio)} kali usaha mikro`} desc="Upah rata-rata per pekerja per bulan, nasional">
          <Chart
            ariaLabel="Grafik kolom upah rata-rata per pekerja per bulan, mikro dan kecil"
            height={250}
            deps={[trend]}
            build={(t) => ({
              ...baseOption(t),
              tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtRb(v) },
              grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
              xAxis: { type: 'category', data: trend.map((d) => d.tahun), ...axis(t), splitLine: { show: false } },
              yAxis: { type: 'value', ...axis(t), axisLabel: { color: t.ink3, formatter: (v: number) => fmtRb(v) } },
              series: (['Mikro', 'Kecil'] as const).map((k, i) => ({
                name: k, type: 'bar', data: trend.map((d) => d[k]), barMaxWidth: 24, barGap: '12%',
                itemStyle: { color: t.series.at(i), borderRadius: [4, 4, 0, 0] },
              })),
            })}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card
          title={prov.length ? `Upah usaha ${skala.toLowerCase()} tertinggi di ${titleCase(prov[0].provinsi)}, terendah di ${titleCase(prov.at(-1)!.provinsi)}` : 'Upah per provinsi'}
          desc={`Upah rata-rata per pekerja per bulan, ${tahun} · garis putus-putus = nasional ${fmtRb(natUpah)}`}
          action={<Segmented label="Skala" value={skala} options={['Mikro', 'Kecil'] as const} onChange={setSkala} />}
        >
          <Chart
            ariaLabel={`Grafik batang upah per pekerja per bulan per provinsi, usaha ${skala}`}
            height={Math.max(420, prov.length * 20 + 40)}
            deps={[prov, natUpah]}
            build={(t) => {
              const list = [...prov].reverse()
              return {
                ...baseOption(t),
                legend: { show: false },
                tooltip: { ...baseOption(t).tooltip, trigger: 'item', formatter: (p: { dataIndex: number }) => {
                  const d = list.at(p.dataIndex)!
                  return `<b>${titleCase(d.provinsi)}</b><br>Upah ${fmtRb(d.upah)} per bulan<br>Porsi upah dari nilai tambah ${fmtPct(d.porsi, 0)}`
                } },
                grid: { left: 8, right: 72, top: 26, bottom: 4, containLabel: true },
                xAxis: { type: 'value', ...axis(t), axisLabel: { show: false } },
                yAxis: { type: 'category', data: list.map((d) => titleCase(d.provinsi)), ...axis(t), axisLabel: { color: t.ink2, fontSize: 12 } },
                series: [{
                  type: 'bar', barMaxWidth: 12, data: list.map((d) => d.upah),
                  itemStyle: { color: t.series[skala === 'Mikro' ? 0 : 1], borderRadius: [0, 4, 4, 0] },
                  label: { show: true, position: 'right', color: t.ink2, fontSize: 11, formatter: (p: { value: number }) => fmtRb(p.value) },
                  markLine: natUpah == null ? undefined : {
                    silent: true, symbol: 'none', animation: false, lineStyle: { color: t.ink3, type: 'dashed', width: 1 },
                    label: { formatter: `nasional ${fmtRb(natUpah)}`, position: 'end', color: t.ink2, fontSize: 11 }, data: [{ xAxis: natUpah }],
                  },
                }],
              }
            }}
          />
        </Card>
        <Insights items={insights} />
      </div>
    </>
  )
}
