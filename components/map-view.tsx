'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Locate, Plus, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIssues } from '@/lib/hooks/useIssues'

// Fix Leaflet's default icon path issues with Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Default center (e.g. Indiranagar, BLR)
const DEFAULT_CENTER: [number, number] = [12.9784, 77.6408]

function RecenterControl({ center }: { center: [number, number] }) {
  const map = useMap()
  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        className="size-9 rounded-full border border-border/60 bg-card/80 backdrop-blur"
        onClick={() => map.setZoom(map.getZoom() + 1)}
      >
        <Plus className="size-4" aria-hidden="true" />
        <span className="sr-only">Zoom in</span>
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="size-9 rounded-full border border-border/60 bg-card/80 backdrop-blur"
        onClick={() => map.setView(center, 14)}
      >
        <Locate className="size-4" aria-hidden="true" />
        <span className="sr-only">Recenter</span>
      </Button>
    </div>
  )
}

export default function MapView() {
  const { issues } = useIssues()

  return (
    <section aria-label="Map of reported issues" className="relative h-60 w-full sm:h-72">
      <MapContainer 
        center={DEFAULT_CENTER} 
        zoom={14} 
        zoomControl={false} 
        scrollWheelZoom={false}
        className="size-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {issues.map((issue, idx) => {
          // Use a stable offset derived from index so markers don't jump on re-render.
          // Real lat/lng from DB takes precedence when available.
          const stableAngle = (idx * 137.508) * (Math.PI / 180) // golden-angle spiral
          const stableR     = 0.005 + (idx % 5) * 0.002
          const lat = (issue as any).latitude  ?? DEFAULT_CENTER[0] + Math.cos(stableAngle) * stableR
          const lng = (issue as any).longitude ?? DEFAULT_CENTER[1] + Math.sin(stableAngle) * stableR
          return (
            <Marker key={issue.id} position={[lat, lng]}>
              <Popup>
                <div className="text-sm font-semibold">{issue.title}</div>
                <div className="text-xs text-muted-foreground">{issue.category} · {issue.status}</div>
              </Popup>
            </Marker>
          )
        })}

        <RecenterControl center={DEFAULT_CENTER} />
      </MapContainer>

      {/* Bottom fade into the feed */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background z-10" />

      {/* Filter chip */}
      <div className="absolute left-3 top-3 z-10">
        <Button
          size="sm"
          variant="secondary"
          className="h-9 gap-1.5 rounded-full border border-border/60 bg-card/80 px-3.5 text-xs font-medium backdrop-blur pointer-events-auto"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Nearby
        </Button>
      </div>
    </section>
  )
}
