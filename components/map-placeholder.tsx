import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => (
    <section aria-label="Loading map..." className="relative h-60 w-full overflow-hidden sm:h-72 bg-secondary/40 animate-pulse flex items-center justify-center">
      <p className="text-muted-foreground text-sm font-medium">Loading Map...</p>
    </section>
  )
})

export function MapPlaceholder() {
  return <MapView />
}
