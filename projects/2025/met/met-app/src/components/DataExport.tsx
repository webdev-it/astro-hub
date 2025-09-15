import { useState } from 'react'

type TrajectoryData = {
  time: number
  altitude: number
  velocity: number
  dynamicPressure: number
  heatFlux: number
  temperature: number
  mass: number
}

type ExportData = {
  scenarioParams: {
    massKg: number
    diameterM: number
    entrySpeedMs: number
    entryAltitudeM: number
    targetLatDeg: number
    targetLonDeg: number
    angleDeg: number
    asteroidType: string
  }
  trajectoryData: TrajectoryData[]
  impactResults?: {
    energyMt: number
    craterDiameter: number
    craterDepth: number
    seismicMagnitude: number
    blastRadius: number
  }
  timestamp: string
}

type Props = {
  data: ExportData
  isVisible: boolean
}

export default function DataExport({ data, isVisible }: Props) {
  const [isExporting, setIsExporting] = useState(false)

  if (!isVisible) return null

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asteroid-impact-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadCSV = () => {
    let csv = 'Time (s),Altitude (m),Velocity (m/s),Dynamic Pressure (Pa),Heat Flux (W/m²),Temperature (K),Mass (kg)\\n'
    
    data.trajectoryData.forEach(point => {
      csv += `${point.time},${point.altitude},${point.velocity},${point.dynamicPressure},${point.heatFlux},${point.temperature},${point.mass}\\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asteroid-trajectory-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateReport = async () => {
    setIsExporting(true)
    
    try {
      // Create a simple HTML report
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Asteroid Impact Analysis Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            .section { margin: 20px 0; }
            .param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .param { background: #f8f9fa; padding: 10px; border-radius: 4px; }
            .critical { color: #e74c3c; font-weight: bold; }
            .warning { color: #f39c12; font-weight: bold; }
            .safe { color: #27ae60; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌍 Asteroid Impact Analysis Report</h1>
            <p>Generated on: ${new Date(data.timestamp).toLocaleString()}</p>
          </div>

          <div class="section">
            <h2>Scenario Parameters</h2>
            <div class="param-grid">
              <div class="param"><strong>Asteroid Type:</strong> ${data.scenarioParams.asteroidType}</div>
              <div class="param"><strong>Mass:</strong> ${(data.scenarioParams.massKg / 1e6).toFixed(1)} million kg</div>
              <div class="param"><strong>Diameter:</strong> ${data.scenarioParams.diameterM} m</div>
              <div class="param"><strong>Entry Speed:</strong> ${(data.scenarioParams.entrySpeedMs / 1000).toFixed(1)} km/s</div>
              <div class="param"><strong>Entry Altitude:</strong> ${(data.scenarioParams.entryAltitudeM / 1000).toFixed(1)} km</div>
              <div class="param"><strong>Entry Angle:</strong> ${data.scenarioParams.angleDeg}°</div>
              <div class="param"><strong>Target Location:</strong> ${data.scenarioParams.targetLatDeg.toFixed(2)}°, ${data.scenarioParams.targetLonDeg.toFixed(2)}°</div>
            </div>
          </div>

          ${data.impactResults ? `
          <div class="section">
            <h2>Impact Consequences</h2>
            <div class="param-grid">
              <div class="param ${data.impactResults.energyMt > 100 ? 'critical' : data.impactResults.energyMt > 1 ? 'warning' : 'safe'}">
                <strong>Impact Energy:</strong> ${data.impactResults.energyMt >= 1 ? 
                  data.impactResults.energyMt.toFixed(2) + ' Mt TNT' : 
                  (data.impactResults.energyMt * 1000).toFixed(1) + ' kt TNT'}
              </div>
              <div class="param"><strong>Crater Diameter:</strong> ${(data.impactResults.craterDiameter / 1000).toFixed(2)} km</div>
              <div class="param"><strong>Crater Depth:</strong> ${data.impactResults.craterDepth.toFixed(0)} m</div>
              <div class="param ${data.impactResults.seismicMagnitude > 7 ? 'critical' : data.impactResults.seismicMagnitude > 5 ? 'warning' : 'safe'}">
                <strong>Seismic Magnitude:</strong> ${data.impactResults.seismicMagnitude.toFixed(1)}
              </div>
              <div class="param"><strong>Blast Radius:</strong> ${(data.impactResults.blastRadius / 1000).toFixed(1)} km</div>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <h2>Trajectory Summary</h2>
            <table>
              <tr>
                <th>Flight Duration</th>
                <th>Max Altitude</th>
                <th>Max Velocity</th>
                <th>Max Dynamic Pressure</th>
                <th>Max Temperature</th>
                <th>Final Mass</th>
              </tr>
              <tr>
                <td>${data.trajectoryData.length > 0 ? data.trajectoryData[data.trajectoryData.length - 1].time.toFixed(1) : 0} s</td>
                <td>${data.trajectoryData.length > 0 ? (Math.max(...data.trajectoryData.map(d => d.altitude)) / 1000).toFixed(1) : 0} km</td>
                <td>${data.trajectoryData.length > 0 ? (Math.max(...data.trajectoryData.map(d => d.velocity)) / 1000).toFixed(1) : 0} km/s</td>
                <td>${data.trajectoryData.length > 0 ? (Math.max(...data.trajectoryData.map(d => d.dynamicPressure)) / 1e6).toFixed(2) : 0} MPa</td>
                <td>${data.trajectoryData.length > 0 ? Math.max(...data.trajectoryData.map(d => d.temperature)).toFixed(0) : 0} K</td>
                <td>${data.trajectoryData.length > 0 ? (data.trajectoryData[data.trajectoryData.length - 1].mass / 1e6).toFixed(1) : 0} million kg</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>Scientific References</h2>
            <ul>
              <li>Collins, G. S., et al. (2005). Earth Impact Effects Program</li>
              <li>Melosh, H. J. (1989). Impact Cratering: A Geologic Process</li>
              <li>Chapman, C. R., & Morrison, D. (1994). Impacts on the Earth by asteroids and comets</li>
              <li>Sutton, K., & Graves, R. A. (1971). A General Stagnation-Point Convective Heating Equation</li>
            </ul>
          </div>

          <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            Report generated by Meteor Madness - Asteroid Impact Simulator<br>
            NASA Space Apps Challenge 2025 Project
          </footer>
        </body>
        </html>
      `

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asteroid-impact-report-${Date.now()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const hasData = data.trajectoryData.length > 0

  return (
    <div style={{ 
      backgroundColor: '#1a1a1a', 
      border: '1px solid #333', 
      borderRadius: '8px', 
      padding: '20px',
      marginTop: '20px'
    }}>
      <h3 style={{ color: '#fff', marginBottom: '20px' }}>📊 Экспорт данных</h3>
      
      {!hasData && (
        <p style={{ color: '#ccc', fontStyle: 'italic' }}>
          Запустите симуляцию для получения данных для экспорта
        </p>
      )}

      {hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          
          <button
            onClick={downloadJSON}
            style={{
              padding: '12px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📄 Скачать JSON
            <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
              Полные данные симуляции
            </div>
          </button>

          <button
            onClick={downloadCSV}
            style={{
              padding: '12px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📊 Скачать CSV
            <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
              Данные траектории
            </div>
          </button>

          <button
            onClick={generateReport}
            disabled={isExporting}
            style={{
              padding: '12px 20px',
              backgroundColor: isExporting ? '#666' : '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isExporting ? '⏳ Генерация...' : '📋 Скачать отчёт'}
            <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
              HTML отчёт с анализом
            </div>
          </button>
        </div>
      )}

      {hasData && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '6px' }}>
          <h4 style={{ color: '#fff', marginBottom: '10px' }}>Доступные данные:</h4>
          <div style={{ color: '#ccc', fontSize: '14px' }}>
            <p>• Параметры сценария: {Object.keys(data.scenarioParams).length} параметров</p>
            <p>• Точки траектории: {data.trajectoryData.length} записей</p>
            <p>• Результаты удара: {data.impactResults ? 'Доступны' : 'Не рассчитаны'}</p>
            <p>• Временной диапазон: {data.trajectoryData.length > 0 ? 
              `0 - ${data.trajectoryData[data.trajectoryData.length - 1].time.toFixed(1)} сек` : 'Нет данных'}</p>
          </div>
        </div>
      )}
    </div>
  )
}