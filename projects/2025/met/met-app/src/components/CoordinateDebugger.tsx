import { useState, useEffect } from 'react'
import { validateCoordinateConversion, latLngToECEF, ecefToLatLng } from '../utils/coordinates'
import { vincentyDistance } from '../utils/geodesy'

type Props = {
  targetLat: number
  targetLng: number
  actualImpactECEF?: { x: number, y: number, z: number }
  isVisible: boolean
}

export default function CoordinateDebugger({ targetLat, targetLng, actualImpactECEF, isVisible }: Props) {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    if (!isVisible) return

    // Расчет отладочной информации
    const targetECEF = latLngToECEF(targetLat, targetLng, 0)
    const targetValidation = validateCoordinateConversion(targetLat, targetLng)
    
    let actualCoords = null
    let coordinateError = null
    
    if (actualImpactECEF) {
      actualCoords = ecefToLatLng(actualImpactECEF)
      
      // Расчет ошибки между целевыми и фактическими координатами
      const latError = Math.abs(targetLat - actualCoords.lat)
      const lngError = Math.abs(targetLng - actualCoords.lng)
      const dist = vincentyDistance({ lat: targetLat, lng: targetLng }, actualCoords)
      coordinateError = { lat: latError, lng: lngError, distance: dist }
    }

    setDebugInfo({
      target: { lat: targetLat, lng: targetLng },
      targetECEF,
      targetValidation,
      actual: actualCoords,
      coordinateError
    })
  }, [targetLat, targetLng, actualImpactECEF, isVisible])

  if (!isVisible || !debugInfo) return null

  return (
    <div style={{ 
      backgroundColor: '#1a1a1a', 
      border: '1px solid #333', 
      borderRadius: '8px', 
      padding: '20px',
      marginTop: '20px'
    }}>
      <h3 style={{ color: '#fff', marginBottom: '20px' }}>🐛 Отладка координат</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Целевые координаты */}
        <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px' }}>
          <h4 style={{ color: '#fff', marginBottom: '10px' }}>🎯 Целевые координаты</h4>
          <div style={{ color: '#ccc', fontSize: '13px', fontFamily: 'monospace' }}>
            <p><strong>Широта:</strong> {debugInfo.target.lat.toFixed(6)}°</p>
            <p><strong>Долгота:</strong> {debugInfo.target.lng.toFixed(6)}°</p>
            <p><strong>ECEF X:</strong> {debugInfo.targetECEF.x.toFixed(0)} м</p>
            <p><strong>ECEF Y:</strong> {debugInfo.targetECEF.y.toFixed(0)} м</p>
            <p><strong>ECEF Z:</strong> {debugInfo.targetECEF.z.toFixed(0)} м</p>
            <p style={{ color: debugInfo.targetValidation.isValid ? '#4CAF50' : '#FF9800' }}>
              <strong>Точность:</strong> {debugInfo.targetValidation.error.toFixed(1)} м
            </p>
          </div>
        </div>

        {/* Фактические координаты удара */}
        <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px' }}>
          <h4 style={{ color: '#fff', marginBottom: '10px' }}>💥 Фактический удар</h4>
          {debugInfo.actual ? (
            <div style={{ color: '#ccc', fontSize: '13px', fontFamily: 'monospace' }}>
              <p><strong>Широта:</strong> {debugInfo.actual.lat.toFixed(6)}°</p>
              <p><strong>Долгота:</strong> {debugInfo.actual.lng.toFixed(6)}°</p>
              {debugInfo.coordinateError && (
                <>
                  <p style={{ color: '#FF6B35', marginTop: '10px' }}>
                    <strong>Ошибка координат:</strong>
                  </p>
                  <p><strong>Δ Широта:</strong> {debugInfo.coordinateError.lat.toFixed(6)}°</p>
                  <p><strong>Δ Долгота:</strong> {debugInfo.coordinateError.lng.toFixed(6)}°</p>
                  <p><strong>Расстояние:</strong> {(debugInfo.coordinateError.distance/1000).toFixed(1)} км</p>
                </>
              )}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>Симуляция не завершена</p>
          )}
        </div>
      </div>

      {/* Рекомендации по исправлению */}
      {debugInfo.coordinateError && debugInfo.coordinateError.distance > 1000 && (
        <div style={{ 
          marginTop: '15px', 
          padding: '15px', 
          backgroundColor: '#3a1a1a', 
          borderRadius: '6px',
          borderLeft: '4px solid #FF6B35'
        }}>
          <h5 style={{ color: '#FF6B35', marginBottom: '10px' }}>⚠️ Обнаружена большая ошибка координат!</h5>
          <p style={{ color: '#ccc', fontSize: '13px' }}>
            Расхождение более {(debugInfo.coordinateError.distance/1000).toFixed(1)} км указывает на проблему в 
            конвертации координат между 3D сценой и географическими координатами. 
            Проверьте функции llhToECEF() и ecefToLatLng().
          </p>
        </div>
      )}

      {/* Статистика точности */}
      <div style={{ 
        marginTop: '15px', 
        padding: '15px', 
        backgroundColor: '#2a2a2a', 
        borderRadius: '6px'
      }}>
        <h5 style={{ color: '#fff', marginBottom: '10px' }}>📊 Анализ точности</h5>
        <div style={{ color: '#ccc', fontSize: '13px' }}>
          <p><strong>Качество координат:</strong> {
            !debugInfo.coordinateError ? 'Ожидание данных' :
            debugInfo.coordinateError.distance < 1000 ? '🟢 Отличное (<1 км)' :
            debugInfo.coordinateError.distance < 10000 ? '🟡 Приемлемое (<10 км)' : 
            '🔴 Требует исправления (>10 км)'
          }</p>
          <p><strong>Рекомендация:</strong> {
            !debugInfo.coordinateError ? 'Запустите симуляцию для анализа' :
            debugInfo.coordinateError.distance < 1000 ? 'Система работает корректно' :
            'Проверьте алгоритмы конвертации координат'
          }</p>
        </div>
      </div>
    </div>
  )
}