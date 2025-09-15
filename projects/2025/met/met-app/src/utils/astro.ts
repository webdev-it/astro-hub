// Basic astronomy helpers for sun direction in ECEF
// Accuracy is sufficient for lighting/shading and day/night terminator visualization.

const DEG2RAD = Math.PI / 180
const TWO_PI = Math.PI * 2

function normalizeAngleRad(a: number) {
  a = a % TWO_PI
  return a < 0 ? a + TWO_PI : a
}

export function julianDay(date: Date): number {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hour = date.getUTCHours()
  const minute = date.getUTCMinutes()
  const second = date.getUTCSeconds() + date.getUTCMilliseconds() / 1000
  let Y = year
  let M = month
  if (M <= 2) {
    Y -= 1
    M += 12
  }
  const A = Math.floor(Y / 100)
  const B = 2 - A + Math.floor(A / 4)
  const dayFrac = (hour + (minute + second / 60) / 60) / 24
  const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + dayFrac + B - 1524.5
  return JD
}

export function daysSinceJ2000(date: Date): number {
  return julianDay(date) - 2451545.0
}

export function gmstRadians(date: Date): number {
  // Rough GMST per IAU-82, good to <1s for our usage
  const d = daysSinceJ2000(date)
  const gmstHours = 18.697374558 + 24.06570982441908 * d
  const gmstRad = normalizeAngleRad((gmstHours % 24) * (Math.PI / 12))
  return gmstRad
}

export type Vec3 = { x: number; y: number; z: number }

export function sunDirectionECI(date: Date): Vec3 {
  // Based on simplified solar position model
  const d = daysSinceJ2000(date)
  // Mean anomaly (deg)
  const g = (357.529 + 0.98560028 * d) * DEG2RAD
  // Mean longitude (deg)
  const q = (280.459 + 0.98564736 * d) * DEG2RAD
  // Ecliptic longitude (deg)
  const L = q + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG2RAD
  // Obliquity of the ecliptic (deg)
  const e = (23.439 - 0.00000036 * d) * DEG2RAD
  // Sun vector in ECI (unit)
  const x = Math.cos(L)
  const y = Math.cos(e) * Math.sin(L)
  const z = Math.sin(e) * Math.sin(L)
  return { x, y, z }
}

export function sunDirectionECEF(date: Date): Vec3 {
  const eci = sunDirectionECI(date)
  const theta = gmstRadians(date)
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)
  // Rotate ECI -> ECEF about Z by GMST
  const x = eci.x * cosT + eci.y * sinT
  const y = -eci.x * sinT + eci.y * cosT
  const z = eci.z
  // Already unit length
  return { x, y, z }
}
