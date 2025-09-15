import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

type TrajectoryData = {
  time: number
  altitude: number
  velocity: number
  dynamicPressure: number
  heatFlux: number
  temperature: number
  mass: number
}

type ImpactConsequences = {
  energyMt: number
  craterDiameter: number
  craterDepth: number
  seismicMagnitude: number
  blastRadius: number
}

type Props = {
  trajectoryData: TrajectoryData[]
  impactConsequences: ImpactConsequences | null
  asteroidType: 'rocky' | 'iron' | 'icy' | 'carbon'
  initialMass: number
  isVisible: boolean
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const asteroidComposition = {
  rocky: { silicates: 60, iron: 25, nickel: 10, other: 5 },
  iron: { iron: 70, nickel: 25, silicates: 3, other: 2 },
  icy: { ice: 80, silicates: 15, organics: 3, other: 2 },
  carbon: { organics: 40, silicates: 35, ice: 20, other: 5 }
}

export default function AnalyticsDashboard({ 
  trajectoryData, 
  impactConsequences, 
  asteroidType, 
  initialMass,
  isVisible 
}: Props) {
  const [activeTab, setActiveTab] = useState<'trajectory' | 'impact' | 'composition'>('trajectory')

  if (!isVisible) return null

  const formatMass = (mass: number) => {
    if (mass >= 1e9) return `${(mass / 1e9).toFixed(1)}B kg`
    if (mass >= 1e6) return `${(mass / 1e6).toFixed(1)}M kg`
    if (mass >= 1e3) return `${(mass / 1e3).toFixed(1)}k kg`
    return `${mass.toFixed(0)} kg`
  }

  const formatEnergy = (energyMt: number) => {
    if (energyMt >= 1000) return `${(energyMt / 1000).toFixed(1)} Gt TNT`
    if (energyMt >= 1) return `${energyMt.toFixed(2)} Mt TNT`
    return `${(energyMt * 1000).toFixed(1)} kt TNT`
  }

  const compositionData = Object.entries(asteroidComposition[asteroidType]).map(([name, value]) => ({
    name,
    value,
    percentage: value
  }))

  return (
    <div style={{ 
      backgroundColor: '#1a1a1a', 
      border: '1px solid #333', 
      borderRadius: '8px', 
      padding: '20px',
      marginTop: '20px'
    }}>
      <h3 style={{ color: '#fff', marginBottom: '20px' }}>Аналитический дашборд</h3>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px' }}>
        {[
          { key: 'trajectory', label: 'Траектория' },
          { key: 'impact', label: 'Последствия удара' },
          { key: 'composition', label: 'Состав астероида' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: activeTab === tab.key ? '#0070f3' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trajectory Tab */}
      {activeTab === 'trajectory' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Altitude & Velocity */}
            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
              <h4 style={{ color: '#fff', marginBottom: '10px' }}>Высота и скорость</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trajectoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="time" stroke="#ccc" />
                  <YAxis yAxisId="left" stroke="#ccc" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ccc" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="altitude" stroke="#8884d8" name="Высота (м)" />
                  <Line yAxisId="right" type="monotone" dataKey="velocity" stroke="#82ca9d" name="Скорость (м/с)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Dynamic Pressure & Heat Flux */}
            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
              <h4 style={{ color: '#fff', marginBottom: '10px' }}>Давление и тепловой поток</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trajectoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="time" stroke="#ccc" />
                  <YAxis yAxisId="left" stroke="#ccc" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ccc" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="dynamicPressure" stroke="#ffc658" name="Динамическое давление (Па)" />
                  <Line yAxisId="right" type="monotone" dataKey="heatFlux" stroke="#ff7300" name="Тепловой поток (Вт/м²)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Temperature & Mass Loss */}
            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
              <h4 style={{ color: '#fff', marginBottom: '10px' }}>Температура и потеря массы</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trajectoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="time" stroke="#ccc" />
                  <YAxis yAxisId="left" stroke="#ccc" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ccc" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#ff4d4f" name="Температура (K)" />
                  <Line yAxisId="right" type="monotone" dataKey="mass" stroke="#52c41a" name="Масса (кг)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Statistics */}
            <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
              <h4 style={{ color: '#fff', marginBottom: '10px' }}>Статистика полёта</h4>
              <div style={{ color: '#ccc', fontSize: '14px' }}>
                {trajectoryData.length > 0 && (
                  <div>
                    <p><strong>Начальная масса:</strong> {formatMass(initialMass)}</p>
                    <p><strong>Конечная масса:</strong> {formatMass(trajectoryData[trajectoryData.length - 1]?.mass || 0)}</p>
                    <p><strong>Потеря массы:</strong> {((1 - (trajectoryData[trajectoryData.length - 1]?.mass || 0) / initialMass) * 100).toFixed(1)}%</p>
                    <p><strong>Максимальная температура:</strong> {Math.max(...trajectoryData.map(d => d.temperature)).toFixed(0)} K</p>
                    <p><strong>Максимальное давление:</strong> {(Math.max(...trajectoryData.map(d => d.dynamicPressure)) / 1e6).toFixed(2)} МПа</p>
                    <p><strong>Время полёта:</strong> {(trajectoryData[trajectoryData.length - 1]?.time || 0).toFixed(1)} с</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Impact Consequences Tab */}
      {activeTab === 'impact' && impactConsequences && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Impact Energy */}
          <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
            <h4 style={{ color: '#fff', marginBottom: '10px' }}>Энергия удара</h4>
            <div style={{ fontSize: '32px', color: '#ff6b35', fontWeight: 'bold', textAlign: 'center' }}>
              {formatEnergy(impactConsequences.energyMt)}
            </div>
            <p style={{ color: '#ccc', textAlign: 'center', marginTop: '10px' }}>
              Эквивалент ядерного взрыва
            </p>
          </div>

          {/* Crater Dimensions */}
          <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
            <h4 style={{ color: '#fff', marginBottom: '10px' }}>Размеры кратера</h4>
            <div style={{ color: '#ccc' }}>
              <p><strong>Диаметр:</strong> {(impactConsequences.craterDiameter / 1000).toFixed(2)} км</p>
              <p><strong>Глубина:</strong> {impactConsequences.craterDepth.toFixed(0)} м</p>
              <p><strong>Объём:</strong> {((Math.PI * Math.pow(impactConsequences.craterDiameter/2, 2) * impactConsequences.craterDepth) / 1e9).toFixed(2)} км³</p>
            </div>
          </div>

          {/* Seismic Effects */}
          <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
            <h4 style={{ color: '#fff', marginBottom: '10px' }}>Сейсмические эффекты</h4>
            <div style={{ color: '#ccc' }}>
              <p><strong>Магнитуда:</strong> {impactConsequences.seismicMagnitude.toFixed(1)} по Рихтеру</p>
              <p><strong>Интенсивность:</strong> {
                impactConsequences.seismicMagnitude > 8 ? 'Катастрофическая' :
                impactConsequences.seismicMagnitude > 6 ? 'Разрушительная' :
                impactConsequences.seismicMagnitude > 4 ? 'Умеренная' : 'Слабая'
              }</p>
            </div>
          </div>

          {/* Blast Effects */}
          <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
            <h4 style={{ color: '#fff', marginBottom: '10px' }}>Взрывная волна</h4>
            <div style={{ color: '#ccc' }}>
              <p><strong>Радиус поражения:</strong> {(impactConsequences.blastRadius / 1000).toFixed(1)} км</p>
              <p><strong>Площадь поражения:</strong> {(Math.PI * Math.pow(impactConsequences.blastRadius/1000, 2)).toFixed(0)} км²</p>
            </div>
          </div>
        </div>
      )}

      {/* Composition Tab */}
      {activeTab === 'composition' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Composition Pie Chart */}
          <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
            <h4 style={{ color: '#fff', marginBottom: '10px' }}>Состав астероида</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(d: any) => `${d.name}: ${d.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {compositionData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Asteroid Type Info */}
          <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '4px' }}>
            <h4 style={{ color: '#fff', marginBottom: '10px' }}>Характеристики типа</h4>
            <div style={{ color: '#ccc' }}>
              {asteroidType === 'rocky' && (
                <div>
                  <p><strong>Тип:</strong> Каменный астероид (S-класс)</p>
                  <p><strong>Плотность:</strong> 3000 кг/м³</p>
                  <p><strong>Прочность:</strong> 100 МПа</p>
                  <p><strong>Описание:</strong> Преимущественно силикатные минералы с металлическими включениями</p>
                </div>
              )}
              {asteroidType === 'iron' && (
                <div>
                  <p><strong>Тип:</strong> Железный астероид (M-класс)</p>
                  <p><strong>Плотность:</strong> 7800 кг/м³</p>
                  <p><strong>Прочность:</strong> 500 МПа</p>
                  <p><strong>Описание:</strong> Металлическое ядро с высоким содержанием железа и никеля</p>
                </div>
              )}
              {asteroidType === 'icy' && (
                <div>
                  <p><strong>Тип:</strong> Ледяной астероид (C-класс)</p>
                  <p><strong>Плотность:</strong> 1000 кг/м³</p>
                  <p><strong>Прочность:</strong> 1 МПа</p>
                  <p><strong>Описание:</strong> Высокое содержание водяного льда с примесями силикатов</p>
                </div>
              )}
              {asteroidType === 'carbon' && (
                <div>
                  <p><strong>Тип:</strong> Углеродистый астероид (C-класс)</p>
                  <p><strong>Плотность:</strong> 2200 кг/м³</p>
                  <p><strong>Прочность:</strong> 50 МПа</p>
                  <p><strong>Описание:</strong> Богат органическими соединениями и гидратированными минералами</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}