import { describe, it, expect } from 'vitest'
import { llhToECEF, ecefToLLA, ecefToLatLng, vincentyDistance } from '../geodesy'

// Reference points: known ECEF from geodetic (approx values). We verify roundtrip and distance.
describe('geodesy WGS84 conversions', () => {
  it('roundtrips Moscow coords within 5m', () => {
    const lat = 55.7558, lng = 37.6173
    const e = llhToECEF(lat, lng, 0)
    const lla = ecefToLLA(e)
    const d = vincentyDistance({ lat, lng }, { lat: lla.lat, lng: lla.lng })
    expect(d).toBeLessThan(5)
    // height near sea-level
    expect(Math.abs(lla.alt)).toBeLessThan(100)
  })

  it('computes precise intercity distances (London-Paris ~ 343 km)', () => {
    const london = { lat: 51.5074, lng: -0.1278 }
    const paris = { lat: 48.8566, lng: 2.3522 }
    const d = vincentyDistance(london, paris) / 1000
    expect(Math.abs(d - 343)).toBeLessThan(1.5)
  })

  it('handles poles and antimeridian', () => {
    const northPole = { lat: 90, lng: 0 }
    const e = llhToECEF(northPole.lat, northPole.lng, 0)
    const back = ecefToLatLng(e)
    expect(back.lat).toBeGreaterThan(89.999)
  })
})
