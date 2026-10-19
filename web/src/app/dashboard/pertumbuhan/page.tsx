import { Suspense } from 'react'
import { Skeleton } from '@/components/ui'
import { getRows } from '@/lib/data'
import { PertumbuhanView } from './pertumbuhan-view'

export default function Page() {
  return (
    <Suspense fallback={<Skeleton h={640} />}>
      <Content />
    </Suspense>
  )
}

async function Content() {
  return <PertumbuhanView rows={await getRows()} />
}
