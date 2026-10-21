import Image from 'next/image'
import Link from 'next/link'
import { EtlFlow } from '@/components/landing/etl-flow'
import { MapSection } from '@/components/landing/map/map-section'
import { Navbar } from '@/components/landing/navbar'
import { CountUp, Reveal } from '@/components/landing/reveal'
import { getLandingData } from '@/lib/data'

const SOURCES = [
  { id: 440, name: 'Jumlah perusahaan', format: 'CSV' },
  { id: 441, name: 'Tenaga kerja', format: 'XLSX' },
  { id: 442, name: 'Nilai input', format: 'JSON' },
  { id: 443, name: 'Nilai output', format: 'CSV' },
  { id: 446, name: 'Pengeluaran tenaga kerja', format: 'XLSX' },
]

const PROCESS = [
  ['Duplikasi', 'File asli disalin utuh'],
  ['Transformasi', 'Nama dan angka diseragamkan'],
  ['Deduplikasi', 'Satu baris per kunci'],
  ['Sinkronisasi', 'Insert/update, aman diulang'],
]

const TIM = [
  { nama: 'Yasika Widiyastuti', nim: '164231030', foto: '/tim/yasika.jpg' },
  { nama: 'Erlina Agustin', nim: '164231035', foto: '/tim/erlina.jpg' },
  { nama: 'Semaya David Petroes P.', nim: '164231048', foto: '/tim/semaya.jpg' },
  { nama: 'Mirza Muhyidin', nim: '164231060', foto: '/tim/mirza.jpg' },
]

const TECH = ['Pentaho', 'SQLite', 'Next.js', 'Three.js', 'ECharts']


export default async function Landing() {
  const d = await getLandingData()
  const stats = [
    { label: 'unit usaha', value: d.latest.usaha, fmt: 'juta' as const },
    { label: 'tenaga kerja', value: d.latest.tenagaKerja, fmt: 'juta' as const },
    { label: 'nilai output', value: d.latest.output, fmt: 'triliun' as const },
    { label: 'provinsi', value: d.latest.provinsi, fmt: 'bulat' as const },
  ]
  const stages = [
    { level: 'Level 1', title: 'Raw', tables: ['raw_csv', 'raw_excel', 'raw_json'], count: d.etl.raw, note: `${d.etl.files} file asli` },
    { level: 'Level 2', title: 'Staging', tables: ['stg_manufaktur'], count: d.etl.staging, note: 'Data bersih' },
    { level: 'Level 3', title: 'Warehouse', tables: ['dim_wilayah', 'dim_waktu', 'dim_skala', 'fact_manufaktur'], count: d.etl.fact, note: 'Skema bintang' },
  ]

  return (
    <>
      <Navbar />
      <main>
        {/* Hero: peta 3D penuh layar, judul di kiri bawah */}
        <section className="relative h-[100svh] min-h-[640px] overflow-hidden">
          <MapSection years={d.years} output={d.output} names={d.names} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <div className="mx-auto max-w-6xl px-4 pb-10 md:px-8 md:pb-14">
              <h1 className="text-[clamp(52px,11vw,152px)] leading-[0.9] font-extrabold tracking-[-0.04em]">MANUFAKTUR</h1>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <p className="max-w-md text-base text-ink-2 md:text-lg">
                  Industri mikro & kecil Indonesia, {d.years[0]}–{d.years.at(-1)}. Data BPS dalam satu warehouse.
                </p>
                <div className="pointer-events-auto flex flex-wrap gap-3">
                  <Link href="/dashboard" className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:brightness-105">Masuk dashboard</Link>
                  <a href="#etl" className="rounded-lg border border-line bg-surface/80 px-5 py-3 text-sm font-semibold backdrop-blur hover:border-ink-3">Lihat alur ETL</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Angka kunci */}
        <Section id="data" no="01" eyebrow={`Data ${d.latest.tahun}`} title="Skala nasional" first>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 120}>
                <div className="border-t-2 border-accent pt-4">
                  <div className="text-[clamp(32px,4.5vw,52px)] leading-none font-extrabold tracking-tight"><CountUp value={s.value} format={s.fmt} /></div>
                  <div className="mt-2 text-sm text-ink-2">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Sumber data */}
        <Section id="sumber" no="02" eyebrow="Sumber data" title="Lima tabel, tiga format">
          <ul className="divide-y divide-line border-y border-line">
            {SOURCES.map((s, i) => (
              <Reveal key={s.id} delay={i * 60}>
                <li className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[6rem_1fr_auto]">
                  <span className="tabular text-sm text-ink-3">BPS {s.id}</span>
                  <span className="font-semibold">{s.name}</span>
                  <span className="w-14 rounded-md bg-accent/12 py-0.5 text-center text-xs font-bold text-accent">{s.format}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </Section>

        {/* Alur ETL */}
        <Section id="etl" no="03" eyebrow="Alur ETL" title="Dari file mentah ke warehouse">
          <EtlFlow stages={stages} />
          <dl className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {PROCESS.map(([t, desc]) => (
              <div key={t}>
                <dt className="font-semibold">{t}</dt>
                <dd className="mt-1 text-sm text-ink-3">{desc}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* Tim */}
        <Section id="tim" no="04" eyebrow="Tim" title="Dikerjakan oleh empat mahasiswa">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
            {TIM.map((t, i) => (
              <li key={t.nim}>
                <Reveal delay={i * 100} className="group">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
                    <Image src={t.foto} alt={`Foto ${t.nama}`} fill sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                  </div>
                  <div className="mt-3 font-semibold leading-snug">{t.nama}</div>
                  <div className="tabular mt-0.5 text-sm text-ink-3">NIM {t.nim}</div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>

        {/* Penutup */}
        <div className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
          <Reveal className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-surface-2 p-8 md:flex-row md:items-center md:p-10">
            <h2 className="max-w-xl text-2xl font-bold tracking-tight md:text-3xl">Jelajahi per provinsi, tahun, dan skala</h2>
            <Link href="/dashboard" className="shrink-0 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-ink hover:brightness-105">Masuk dashboard</Link>
          </Reveal>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ink-3 md:flex-row md:justify-between md:px-8">
          <p>Data: BPS · {TECH.join(' · ')}</p>
          <p>
            Peta:{' '}
            <a className="underline hover:text-ink" href="https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces">Indonesia GeoJSON</a>{' '}
            (<a className="underline hover:text-ink" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>) ·{' '}
            <a className="underline hover:text-ink" href="https://github.com/mirzamhy/etl-manufaktur-bps">Kode sumber</a>
          </p>
        </div>
      </footer>
    </>
  )
}

/** Kerangka section seragam: nomor + label, judul, deskripsi, lalu isi. */
function Section({ id, no, eyebrow, title, desc, first, children }: {
  id: string; no: string; eyebrow: string; title: string; desc?: string; first?: boolean; children: React.ReactNode
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-4 md:px-8">
      <div className={`py-20 md:py-24 ${first ? '' : 'border-t border-line'}`}>
        <Reveal>
          <p className="text-sm font-semibold text-accent"><span className="tabular text-ink-3">{no}</span> · {eyebrow}</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
          {desc && <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{desc}</p>}
        </Reveal>
        <div className="mt-10 md:mt-12">{children}</div>
      </div>
    </section>
  )
}
