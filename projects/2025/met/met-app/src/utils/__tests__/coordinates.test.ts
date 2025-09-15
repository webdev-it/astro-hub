import { describe, it, expect } from 'vitest'
import { latLngToECEF, ecefToLatLng, validateCoordinateConversion } from '../coordinates'

describe('coordinates facade', () => {
  it('validates conversion within 5m', () => {
    const { isValid, error } = validateCoordinateConversion(35.6895, 139.6917) // Tokyo
    expect(isValid).toBe(true)
    expect(error).toBeLessThan(5)
  })

  it('latLngToECEF <-> ecefToLatLng roundtrip', () => {
    const ecef = latLngToECEF(-33.8688, 151.2093, 0) // Sydney
    const back = ecefToLatLng(ecef)
    expect(Math.abs(back.lat + 33.8688)).toBeLessThan(0.01)
    expect(Math.abs(back.lng - 151.2093)).toBeLessThan(0.01)
  })
})
