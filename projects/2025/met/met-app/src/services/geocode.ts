// Reverse geocoding helpers to produce precise place names from lat/lon.
// Strategy: Try OSM Nominatim (jsonv2), fallback to geocode.maps.co, then Open-Meteo.
// Return a concise Russian label suitable for logs. Offline fallback can be provided by caller.

import { vincentyDistance } from '../utils/geodesy'

export type GeoLabel = {
  label: string
  source: 'nominatim' | 'mapsco' | 'open-meteo' | 'fallback'
}

const cache = new Map<string, GeoLabel>()
const key = (lat: number, lon: number) => `${lat.toFixed(5)},${lon.toFixed(5)}`

function toRuOcean(name: string): string {
  const low = name.toLowerCase()
  if (low.includes('indian')) return 'Индийский океан'
  if (low.includes('atlantic')) return low.includes('north') ? 'северная часть Атлантического океана' : (low.includes('south') ? 'южная часть Атлантического океана' : 'Атлантический океан')
  if (low.includes('pacific')) return low.includes('north') ? 'северная часть Тихого океана' : (low.includes('south') ? 'южная часть Тихого океана' : 'Тихий океан')
  if (low.includes('arctic')) return 'Северный Ледовитый океан'
  if (low.includes('southern') || low.includes('antarctic')) return 'Южный океан'
  return name
}

function joinNonEmpty(parts: Array<string | undefined | null>, sep = ', '): string {
  return parts.filter(Boolean).join(sep)
}

async function fetchJson(url: string, timeoutMs = 5000): Promise<any> {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } })
    if (!res.ok) throw new Error(`${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(id)
  }
}

function formatNominatim(json: any): GeoLabel | null {
  if (!json) return null
  const a = json.address || {}
  // Ocean/sea first
  const ocean = a.ocean || a.sea || a.sea_area
  if (ocean) {
    return { label: toRuOcean(String(ocean)), source: 'nominatim' }
  }
  const water = a.water || a.waterway
  if (water) {
    // e.g., Gulf/Bay/Sea name
    return { label: String(water), source: 'nominatim' }
  }
  // Settlement hierarchy
  const place = a.city || a.town || a.village || a.hamlet || a.locality || a.county || a.region
  const admin = a.state || a.province
  const country = a.country
  if (place || admin || country) {
    return { label: joinNonEmpty([place, admin, country]), source: 'nominatim' }
  }
  // Fallback to display_name first token(s)
  if (json.display_name) {
    const first = String(json.display_name).split(',').slice(0, 3).join(', ')
    return { label: first, source: 'nominatim' }
  }
  return null
}

function formatMapsCo(json: any): GeoLabel | null {
  if (!json) return null
  const a = json.address || {}
  const ocean = a.ocean || a.sea
  if (ocean) return { label: toRuOcean(String(ocean)), source: 'mapsco' }
  const place = a.city || a.town || a.village || a.hamlet || a.suburb || a.county
  const admin = a.state
  const country = a.country
  if (place || admin || country) {
    return { label: joinNonEmpty([place, admin, country]), source: 'mapsco' }
  }
  if (json.display_name) {
    const first = String(json.display_name).split(',').slice(0, 3).join(', ')
    return { label: first, source: 'mapsco' }
  }
  return null
}

function formatOpenMeteo(json: any, lat: number, lon: number): GeoLabel | null {
  if (!json || !json.results || !json.results.length) return null
  const r = json.results[0]
  const name = r.name
  const admin = r.admin1 || r.admin2
  const country = r.country
  let label = joinNonEmpty([name, admin, country])
  // If API provided original coordinates, compute approx distance
  if (typeof r.latitude === 'number' && typeof r.longitude === 'number') {
    const d = vincentyDistance({ lat, lng: lon }, { lat: r.latitude, lng: r.longitude })
    if (isFinite(d)) {
      const km = Math.round(d / 1000)
      label += km > 0 ? ` — близко к ${name} (≈${km} км)` : ''
    }
  }
  return { label, source: 'open-meteo' }
}

export async function resolveLocationLabel(lat: number, lon: number): Promise<GeoLabel> {
  const k = key(lat, lon)
  const cached = cache.get(k)
  if (cached) return cached
  // Try Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ru&zoom=10&addressdetails=1`
    const json = await fetchJson(url, 6000)
    const lab = formatNominatim(json)
    if (lab) { cache.set(k, lab); return lab }
  } catch { /* ignore */ }
  // Try geocode.maps.co (proxy to Nominatim)
  try {
    const url = `https://geocode.maps.co/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ru`;
    const json = await fetchJson(url, 6000)
    const lab = formatMapsCo(json)
    if (lab) { cache.set(k, lab); return lab }
  } catch { /* ignore */ }
  // Try Open-Meteo geocoding (nearest place; may map ocean to nearest coast)
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ru&count=1`;
    const json = await fetchJson(url, 6000)
    const lab = formatOpenMeteo(json, lat, lon)
    if (lab) { cache.set(k, lab); return lab }
  } catch { /* ignore */ }
  // Fallback
  const fallback: GeoLabel = { label: 'Не удалось определить (офлайн)', source: 'fallback' }
  cache.set(k, fallback)
  return fallback
}
