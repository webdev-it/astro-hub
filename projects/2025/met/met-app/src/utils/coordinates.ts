// Координатная утилита для конвертации между разными системами координат

import type { Coordinates } from './geodesy'
import { llhToECEF, ecefToLatLng as ecefToLatLngWGS84, vincentyDistance } from './geodesy'
export type ECEF = { x: number; y: number; z: number }

/**
 * Конвертация географических координат в ECEF (Earth-Centered, Earth-Fixed)
 */
export function latLngToECEF(lat: number, lng: number, altitude: number = 0): ECEF {
  return llhToECEF(lat, lng, altitude)
}

/**
 * Конвертация ECEF координат в географические
 */
export function ecefToLatLng(ecef: ECEF): Coordinates {
  return ecefToLatLngWGS84(ecef)
}

/**
 * Конвертация 3D сцены координат в географические
 * @param scenePosition Позиция в 3D сцене (где 1 unit = радиус Земли)
 */
export function sceneToLatLng(scenePosition: { x: number, y: number, z: number }): Coordinates {
  // Масштабируем обратно к метрам (1 scene unit = R_EARTH)
  const R_EARTH = 6_371_000
  const ecef = {
    x: scenePosition.x * R_EARTH,
    y: scenePosition.y * R_EARTH,
    z: scenePosition.z * R_EARTH
  }
  return ecefToLatLng(ecef)
}

/**
 * Вычисление расстояния между двумя точками на Земле (формула гаверсинуса)
 */
export function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  // Keep as a quick estimator by delegating to Vincenty for accuracy in this scientific context.
  return vincentyDistance(coord1, coord2)
}

/**
 * Проверка точности позиционирования
 */
export function validateCoordinateConversion(originalLat: number, originalLng: number): {
  isValid: boolean
  error: number
  message: string
} {
  const ecef = latLngToECEF(originalLat, originalLng)
  const converted = ecefToLatLng(ecef)
  const distance = vincentyDistance({ lat: originalLat, lng: originalLng }, converted)
  
  return {
    isValid: distance < 5, // Для научного инструмента потребуем < 5 м
    error: distance,
    message: `Ошибка конвертации: ${distance.toFixed(2)} метров`
  }
}