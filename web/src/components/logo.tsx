/** Logo pabrik — ikon "building-factory-2" dari Tabler Icons (MIT). */
export function Logo({ className = 'size-9' }: { className?: string }) {
  return (
    <span className={`grid flex-none place-items-center rounded-[9px] bg-accent text-accent-ink ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21v-12l5 4v-4l5 4h4" />
        <path d="M19 21v-8l-1.436 -9.574a.5 .5 0 0 0 -.495 -.426h-1.145a.5 .5 0 0 0 -.494 .418l-1.43 8.582" />
        <path d="M9 17h1" />
        <path d="M14 17h1" />
      </svg>
    </span>
  )
}
