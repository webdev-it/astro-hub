import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { validateCoordinateConversion } from '../utils/geodesy'

// Fix default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

type Props = {
  location: [number, number]
  onLocationChange: (lat: number, lng: number) => void
  impactData?: {
    craterRadius: number // meters (radius, not diameter)
    blastRadius: number // meters  
    seismicRadius: number // meters
  } | null
  showDamageZones?: boolean
}

function LocationPicker({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      
      // Проверяем точность конвертации координат
      const validation = validateCoordinateConversion(lat, lng)
      if (!validation.isValid) {
        console.warn(`Координатная точность снижена: ${validation.message}`)
      }
      
      onLocationChange(lat, lng)
    },
  })
  return null
}

function DamageZones({ lat, lng, impactData }: { lat: number, lng: number, impactData: Props['impactData'] }) {
  if (!impactData) return null
  
  return (
    <>
      {/* Crater zone - red */}
      <Circle
        center={[lat, lng]}
        radius={impactData.craterRadius}
        pathOptions={{ 
          color: '#ff0000', 
          fillColor: '#ff0000', 
          fillOpacity: 0.3,
          weight: 2
        }}
      />
      
      {/* Blast damage zone - orange */}
      <Circle
        center={[lat, lng]}
        radius={impactData.blastRadius}
        pathOptions={{ 
          color: '#ff8800', 
          fillColor: '#ff8800', 
          fillOpacity: 0.15,
          weight: 2
        }}
      />
      
      {/* Seismic effects zone - yellow */}
      <Circle
        center={[lat, lng]}
        radius={impactData.seismicRadius}
        pathOptions={{ 
          color: '#ffdd00', 
          fillColor: '#ffdd00', 
          fillOpacity: 0.1,
          weight: 1
        }}
      />
    </>
  )
}

export default function ImpactMap({ location, onLocationChange, impactData, showDamageZones = true }: Props) {
  const [lat, lng] = location
  
  // Проверяем точность координат
  const coordinateValidation = validateCoordinateConversion(lat, lng)
  
  return (
    <div style={{ height: '400px', width: '100%', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
      {/* Информационная панель с координатами */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000,
        fontFamily: 'monospace'
      }}>
        <div>📍 {lat.toFixed(4)}°, {lng.toFixed(4)}°</div>
        <div style={{ color: coordinateValidation.isValid ? '#4CAF50' : '#FF9800' }}>
          ⚡ Точность: {coordinateValidation.error.toFixed(1)}м
        </div>
      </div>
      
      <MapContainer
        center={[lat, lng]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        <LocationPicker onLocationChange={onLocationChange} />
        
        <Marker position={[lat, lng]} />
        
        {showDamageZones && impactData && (
          <DamageZones lat={lat} lng={lng} impactData={impactData} />
        )}
      </MapContainer>
    </div>
  )
}