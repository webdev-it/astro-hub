// High-accuracy geodesy utilities (WGS84) suitable for scientific use

export type Vector3 = { x: number; y: number; z: number }
export type Coordinates = { lat: number; lng: number }
export type LLA = { lat: number; lng: number; alt: number }

// WGS84 ellipsoid constants
export const WGS84_A = 6378137.0 // semi-major axis (m)
export const WGS84_F = 1 / 298.257223563 // flattening
export const WGS84_B = WGS84_A * (1 - WGS84_F) // semi-minor axis (m)
export const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F // first eccentricity squared
export const WGS84_EP2 = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B) // second ecc. squared

export const deg2rad = (deg: number) => (deg * Math.PI) / 180
export const rad2deg = (rad: number) => (rad * 180) / Math.PI

// Convert geodetic latitude/longitude/height to ECEF (meters)
export function llhToECEF(latDeg: number, lonDeg: number, hM: number): Vector3 {
  const lat = deg2rad(latDeg)
  const lon = deg2rad(lonDeg)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const sinLon = Math.sin(lon)
  const cosLon = Math.cos(lon)
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat)

  const x = (N + hM) * cosLat * cosLon
  const y = (N + hM) * cosLat * sinLon
  const z = (N * (1 - WGS84_E2) + hM) * sinLat
  return { x, y, z }
}

// Convert ECEF to geodetic LLA (degrees/meters) using an iterative method for accuracy
export function ecefToLLA(ecef: Vector3): LLA {
  const x = ecef.x
  const y = ecef.y
  const z = ecef.z

  const p = Math.hypot(x, y)
  const lon = Math.atan2(y, x)

  // Initial latitude approximation
  let lat = Math.atan2(z, p * (1 - WGS84_E2))
  let h = 0

  for (let i = 0; i < 10; i++) {
    const sinLat = Math.sin(lat)
    const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat)
    h = p / Math.cos(lat) - N
    const newLat = Math.atan2(z, p * (1 - WGS84_E2 * N / (N + h)))
    if (Math.abs(newLat - lat) < 1e-12) {
      lat = newLat
      break
    }
    lat = newLat
  }

  return { lat: rad2deg(lat), lng: rad2deg(lon), alt: h }
}

// Convenience: return only lat/lng (deg)
export function ecefToLatLng(ecef: Vector3): { lat: number; lng: number } {
  const { lat, lng } = ecefToLLA(ecef)
  return { lat, lng }
}

// Local East-North-Up frame axes unit vectors at given geodetic location
export function localFrame(latDeg: number, lonDeg: number) {
  const lat = deg2rad(latDeg)
  const lon = deg2rad(lonDeg)
  const e = { x: -Math.sin(lon), y: Math.cos(lon), z: 0 }
  const n = { x: -Math.sin(lat) * Math.cos(lon), y: -Math.sin(lat) * Math.sin(lon), z: Math.cos(lat) }
  const u = { x: Math.cos(lat) * Math.cos(lon), y: Math.cos(lat) * Math.sin(lon), z: Math.sin(lat) }
  return { e, n, u }
}

// Haversine distance on a sphere (fallback/quick estimate). Uses mean Earth radius.
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371008.8 // mean Earth radius (m)
  const dLat = deg2rad(b.lat - a.lat)
  const dLon = deg2rad(b.lng - a.lng)
  const lat1 = deg2rad(a.lat)
  const lat2 = deg2rad(b.lat)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

// Vincenty inverse formula for geodesic distance on WGS84 ellipsoid (accurate to <1mm typically)
export function vincentyDistance(a: Coordinates, b: Coordinates): number {
  const φ1 = deg2rad(a.lat)
  const λ1 = deg2rad(a.lng)
  const φ2 = deg2rad(b.lat)
  const λ2 = deg2rad(b.lng)

  const U1 = Math.atan((1 - WGS84_F) * Math.tan(φ1))
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(φ2))
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1)
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2)

  const L = λ2 - λ1
  let λ = L
  let sinλ = 0, cosλ = 0
  let sinσ = 0, cosσ = 0, σ = 0
  let sinα = 0, cos2α = 0, cos2σm = 0
  let C = 0

  for (let iter = 0; iter < 100; iter++) {
    sinλ = Math.sin(λ)
    cosλ = Math.cos(λ)
    sinσ = Math.hypot(
      cosU2 * sinλ,
      cosU1 * sinU2 - sinU1 * cosU2 * cosλ
    )
    if (sinσ === 0) return 0 // coincident points
    cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ
    σ = Math.atan2(sinσ, cosσ)
    sinα = (cosU1 * cosU2 * sinλ) / sinσ
    cos2α = 1 - sinα * sinα
    cos2σm = cos2α === 0 ? 0 : cosσ - (2 * sinU1 * sinU2) / cos2α
    C = (WGS84_F / 16) * cos2α * (4 + WGS84_F * (4 - 3 * cos2α))
    const λPrev = λ
    λ = L + (1 - C) * WGS84_F * sinα * (
      σ + C * sinσ * (
        cos2σm + C * cosσ * (-1 + 2 * cos2σm * cos2σm)
      )
    )
    if (Math.abs(λ - λPrev) < 1e-12) break
    if (iter === 99) {
      // Fallback to haversine if not converged
      return haversineDistance(a, b)
    }
  }

  const u2 = cos2α * ((WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B))
  const A = 1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)))
  const B = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)))
  const Δσ = B * sinσ * (
    cos2σm + (B / 4) * (
      cosσ * (-1 + 2 * cos2σm * cos2σm) -
      (B / 6) * cos2σm * (-3 + 4 * sinσ * sinσ) * (-3 + 4 * cos2σm * cos2σm)
    )
  )

  const s = WGS84_B * A * (σ - Δσ)
  return Math.max(0, s)
}

// Validate that LLH -> ECEF -> LLA roundtrip error is within tolerance (meters)
export function validateCoordinateConversion(lat: number, lng: number, alt = 0, toleranceM = 5) {
  const ecef = llhToECEF(lat, lng, alt)
  const lla = ecefToLLA(ecef)
  const error = vincentyDistance({ lat, lng }, { lat: lla.lat, lng: lla.lng })
  return {
    isValid: error <= toleranceM,
    error,
    message: `Погрешность конвертации: ${error.toFixed(2)} м`
  }
}
