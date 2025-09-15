import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
// import PostFX from './components/three/PostFX'
import PostFX from './components/three/PostFX'
// import Atmosphere from './components/three/Atmosphere'
import SimpleEarth from './components/three/SimpleEarth'
import Earth from './components/three/Earth'
import Atmosphere from './components/three/Atmosphere'
import Clouds from './components/three/Clouds'
import Asteroid from './components/three/Asteroid'
import ErrorBoundary from './components/ErrorBoundary'
import ExplosionParticles from './components/three/ExplosionParticles'
import Shockwave from './components/three/Shockwave'
import CraterMark from './components/three/CraterMark'
import TrajectoryTrail from './components/three/TrajectoryTrail'
import DustBillboard from './components/three/DustBillboard'
// import Clouds from './components/three/Clouds'
// import { ImpactPrediction } from './components/three/TrajectoryTrail'
import { fetchNEOs } from './services/nasa'
import { useScenarioStore } from './store/useScenarioStore'
import { llhToECEF, localFrame, ecefToLatLng } from './utils/geodesy'
import { sunDirectionECEF } from './utils/astro'
import { R_EARTH, stepAtmosphericEntry, impactEnergyMtTNT, calculateCraterDiameter, earthImpulseDeltaV, vecLen, predictTrajectory, calculateSeismicEffects, calculateBlastEffects, ASTEROID_TYPES, getLocationName, calculateAccurateTrajectory } from './utils/physics'
import { resolveLocationLabel } from './services/geocode'
import type { Vector3 } from './utils/physics'
import ImpactMap from './components/ImpactMap'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import DataExport from './components/DataExport'
import HistoricalEvents from './components/HistoricalEvents'
import CoordinateDebugger from './components/CoordinateDebugger'
import ShareScenario, { tryParseShareURL } from './components/ShareScenario'
import MethodologyModal from './components/MethodologyModal'
import Tooltip from './components/Tooltip'

function Explosion({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  const [life, setLife] = useState(0)
  useFrame((_, dt) => setLife((l) => l + dt))
  const scale = Math.min(1, life * 3)
  const opacity = Math.max(0, 1 - life * 0.8)
  if (opacity <= 0) return null
  return (
    <mesh ref={ref} position={position} scale={scale} onUpdate={(m) => { m.layers.enable(1) }}>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial emissive="#ff6600" emissiveIntensity={4} transparent opacity={opacity} color="#ffaa00" />
    </mesh>
  )
}

const METER_SCALE = R_EARTH // 1 scene unit = 1 Earth radius

function GeoGrid({ stepDeg = 30, radius = 1.001, color = '#2a8' }: { stepDeg?: number; radius?: number; color?: string }) {
  const geoms = useMemo(() => {
    const list: THREE.BufferGeometry[] = []
    // Meridians
    for (let lon = -180; lon <= 180; lon += stepDeg) {
      const pts: number[] = []
      for (let lat = -89; lat <= 89; lat += 2) {
        const la = (lat * Math.PI) / 180
        const lo = (lon * Math.PI) / 180
        const x = Math.cos(la) * Math.cos(lo) * radius
        const y = Math.sin(la) * radius
        const z = -Math.cos(la) * Math.sin(lo) * radius // flip Z to match scene mapping
        pts.push(x, y, z)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pts), 3))
      list.push(g)
    }
    // Parallels
    for (let lat = -60; lat <= 60; lat += stepDeg) {
      const la = (lat * Math.PI) / 180
      const pts: number[] = []
      for (let lon = -180; lon <= 180; lon += 2) {
        const lo = (lon * Math.PI) / 180
        const x = Math.cos(la) * Math.cos(lo) * radius
        const y = Math.sin(la) * radius
        const z = -Math.cos(la) * Math.sin(lo) * radius // flip Z to match scene mapping
        pts.push(x, y, z)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pts), 3))
      list.push(g)
    }
    return list
  }, [stepDeg, radius])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color }), [color])
  return (
    <group>
      {geoms.map((g, i) => (
        <primitive key={i} object={new THREE.Line(g, mat)} />
      ))}
    </group>
  )
}

function GeoMarkers({
  targetLat,
  targetLng,
  impactECEF,
  earthRef
}: {
  targetLat: number
  targetLng: number
  impactECEF?: { x: number; y: number; z: number }
  earthRef: React.RefObject<THREE.Mesh>
}) {
  // Compute positions in scene space and then convert to Earth's local space so they stay pinned
  const targetECEF = useMemo(() => llhToECEF(targetLat, targetLng, 0), [targetLat, targetLng])
  const toScene = (p: Vector3) => new THREE.Vector3(p.x / R_EARTH, p.z / R_EARTH, -p.y / R_EARTH)
  const toLocal = (v: THREE.Vector3) => (earthRef.current ? earthRef.current.worldToLocal(v.clone()) : v)
  const targetLocal = useMemo(() => toLocal(toScene(targetECEF)), [targetECEF, earthRef.current])
  const impactLocal = useMemo(() => (impactECEF ? toLocal(toScene(impactECEF)) : null), [impactECEF, earthRef.current])

  const pinMat = new THREE.MeshBasicMaterial({ color: '#ff4455' })
  const pinMatImpact = new THREE.MeshBasicMaterial({ color: '#44ddff' })
  const pinGeom = new THREE.SphereGeometry(0.01, 12, 12)

  return (
    <group>
      {/* Greenwich marker for reference at (0°N, 0°E) after texture offset visual alignment */}
      <mesh position={toLocal(new THREE.Vector3(1, 0, 0))}>
        <sphereGeometry args={[0.008, 10, 10]} />
        <meshBasicMaterial color="#55ff88" />
      </mesh>
      {/* Target pin */}
      <mesh position={targetLocal} material={pinMat} geometry={pinGeom} />
      {/* Impact pin (if available) */}
      {impactLocal && <mesh position={impactLocal} material={pinMatImpact} geometry={pinGeom} />}
    </group>
  )
}

function Scene() {
  const { body, setBody, params, simState, setSimState, t, setTime, pushLog, setImpactPoint, impactPoint, initialSpeedMs, peakDynamicPressurePa, setPeakDynamicPressure, peakHeatFluxWm2, setPeakHeatFlux, setImpactEnergy, simTimeScale, impactTargetSeconds, simplifyEffects, enableBloom, bloomIntensity, useAdvancedEarth, showClouds, showAtmosphere, addTrajectoryPoint, setLastImpactECEF, setLastCrater, forceExactHit, selectiveBloom, cinematicMode, uvOffsetDeg, showGeoGrid, showGeoMarkers } = useScenarioStore()
  const impactReported = useRef(false)
  const accumTime = useRef(0)
  const lastResult = useRef<any>(null)
  const trajectoryPoints = useRef<THREE.Vector3[]>([])
  // const predictedImpactPoint = useRef<THREE.Vector3 | null>(null)
  const earthRef = useRef<THREE.Mesh>(null)
  const [localImpact, setLocalImpact] = useState<THREE.Vector3 | null>(null)
  const visScalesRef = useRef({ crater: 0.08, shock: 0.35, explosionPower: 0.8 })
  const [debris, setDebris] = useState<Array<{ id: number; pos: THREE.Vector3; vel: THREE.Vector3; life: number }>>([])
  const debrisId = useRef(0)
  // Map ECEF meters to scene units with Y-up, lon0 along +X (SphereGeometry seam)
  // ECEF: X=lon 0, Y=lon 90E, Z=North
  // Scene: X=lon 0, Z=lon 90E, Y=North
  const ecefToScene = (p: Vector3): THREE.Vector3 => new THREE.Vector3(
    p.x / METER_SCALE, // scene X from ECEF X (lon 0)
    p.z / METER_SCALE, // scene Y from ECEF Z (north)
    -p.y / METER_SCALE  // scene Z from -ECEF Y (flip to correct left-right)
  )
  

  // Reset trail and impact visuals when a new run starts
  useEffect(() => {
    if (simState === 'running') {
      trajectoryPoints.current = []
      setLocalImpact(null)
      impactReported.current = false
    }
  }, [simState])
  
  // Sun direction from astronomy (ECEF) converted to scene/up mapping
  const sunDirRef = useRef(new THREE.Vector3(1, 0.3, 0.8).normalize())
  // const dirLightRef = useRef<THREE.DirectionalLight>(null)

  // Update sun direction from UTC time (every frame for simplicity; cheap math)
  useFrame(() => {
    const now = new Date()
    const sECEF = sunDirectionECEF(now)
    // Map ECEF (X,Y,Z) -> scene (X,Y,Z) where scene Y is ECEF Z
    const sx = sECEF.x
    const sy = sECEF.z
    const sz = -sECEF.y
    sunDirRef.current.set(sx, sy, sz).normalize()
  })

  useFrame((_, delta) => {
    if (!body || simState !== 'running') return
    
  // Use calibrated visualization time scale targeting ~5s to impact
  const timeScale = simTimeScale ?? 0.15
  const physicsTimeStep = 0.02 // smaller step for smoother motion
    let visualDelta = Math.min(delta * timeScale, 0.08)
    // Optional lightweight runtime correction to approach target impact time more precisely
    if (!impactReported.current && impactTargetSeconds) {
      // Estimate remaining time-to-impact using downward rate and altitude
      const p = body.positionM
      const v = body.velocityMs
      const rMag = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z)
      const alt = Math.max(0, rMag - R_EARTH)
      const u = { x: p.x / rMag, y: p.y / rMag, z: p.z / rMag } // up
      const downRate = Math.max(1, -(v.x*u.x + v.y*u.y + v.z*u.z))
      const estLeft = alt / downRate
      const elapsed = t
      const err = impactTargetSeconds - elapsed - estLeft
      // Small proportional correction on visualDelta (kept tiny to avoid jitter)
      const kP = 0.02
      visualDelta = Math.max(0, visualDelta * (1 + kP * err))
      visualDelta = Math.min(0.12, Math.max(0.0, visualDelta))
    }
    
    // Update debris (visual-only kinematics)
    if (debris.length) {
      const next = debris.map((d) => ({
        ...d,
        pos: d.pos.clone().add(d.vel.clone().multiplyScalar(visualDelta)),
        life: d.life - visualDelta,
      })).filter((d) => d.life > 0)
      if (next.length !== debris.length) setDebris(next)
      else setDebris(next) // replace to trigger re-render
    }

    // Accumulate time for physics steps
    accumTime.current += visualDelta
    
    // Run physics much less frequently
    // Process multiple fixed steps if needed (capped)
    let steps = 0
    while (accumTime.current >= physicsTimeStep && steps < 5) {
      const res = stepAtmosphericEntry(body, { 
        dt: physicsTimeStep,
        ablationCoeff: 1e-9, // Minimal ablation
        attitudeFactor: 1.0 
      })
      
      lastResult.current = res
      
      // More realistic fragmentation based on asteroid strength
      const asteroidType = body.asteroidType || 'rocky'
      const asteroidProps = ASTEROID_TYPES[asteroidType]
      const qFrag = asteroidProps.strength // Use material strength instead of fixed threshold
      
      if (!body.fragmented && res.dynamicPressurePa > qFrag) {
        pushLog({ time: t, message: `Фрагментация ${asteroidType} тела при q≈${(res.dynamicPressurePa/1e6).toFixed(1)} МПа` })
        setBody({ 
          ...res.body, 
          fragmented: true, 
          fragmentCount: res.body.fragmentCount || 1,
          areaMultiplier: res.body.areaMultiplier || 1,
          asteroidType 
        })
        
        // Create more realistic debris based on fragment count
        const fragmentCount = res.body.fragmentCount || 2
        const basePos = ecefToScene(res.body.positionM)
        const pieces = Array.from({ length: Math.min(fragmentCount, 8) }, () => {
          const id = ++debrisId.current
          const dir = new THREE.Vector3().randomDirection()
          const speed = 0.1 + Math.random() * 0.4 // Slower, more realistic speeds
          return { id, pos: basePos.clone(), vel: dir.multiplyScalar(speed), life: 2.5 }
        })
        setDebris((d) => [...d, ...pieces])
      } else {
        setBody(res.body)
      }
      
      // Record a sparse trajectory point for trail
      if (trajectoryPoints.current.length % 3 === 0) {
        const pos = ecefToScene(res.body.positionM)
        trajectoryPoints.current.push(pos)
        if (trajectoryPoints.current.length > 30) trajectoryPoints.current.shift()
      }
      
      accumTime.current -= physicsTimeStep
      steps++
    }
    
    if (!lastResult.current) return
    const res = lastResult.current
    
    setTime(t + visualDelta)
    
    // Track trajectory data for analytics (sample every few frames to avoid too much data)
    if (Math.floor(t * 10) % 3 === 0) { // Sample ~3 times per second
      const p = res.body.positionM
      const v = res.body.velocityMs
      const rMag = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z)
      const altitude = Math.max(0, rMag - R_EARTH)
      const velocity = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z)
      
      addTrajectoryPoint({
        time: t,
        altitude,
        velocity,
        dynamicPressure: res.dynamicPressurePa,
        heatFlux: res.heatFluxWm2,
        temperature: res.temperatureK || 300, // Default temperature if not calculated
        mass: res.body.massKg
      })
    }
    
    if (!peakDynamicPressurePa || res.dynamicPressurePa > peakDynamicPressurePa) {
      setPeakDynamicPressure(res.dynamicPressurePa)
    }
    if (!peakHeatFluxWm2 || res.heatFluxWm2 > peakHeatFluxWm2) {
      setPeakHeatFlux(res.heatFluxWm2)
    }

    // Skip trajectory prediction for performance
    
    // Impact check
    const r = vecLen(res.body.positionM)
    if (r <= R_EARTH && !impactReported.current) {
      impactReported.current = true
      setImpactEnergy(res.energyJ)
      const energyMt = impactEnergyMtTNT(res.energyJ)
  const craterData = calculateCraterDiameter(energyMt, 'sediment')
      const seismicData = calculateSeismicEffects(energyMt, 100) // 100km distance example
      const blastData = calculateBlastEffects(energyMt, 50) // 50km distance example
      const dV_impact = earthImpulseDeltaV(res.energyJ)
      
      // Calculate impact coordinates (lat/lng) - ИСПРАВЛЕНО
      const impactPos = res.body.positionM
      let { lat, lng } = ecefToLatLng(impactPos)
      let finalImpactPos = impactPos
      
      // Принудительная точность - переносим удар в точную целевую точку
      if (forceExactHit) {
        lat = params.targetLatDeg
        lng = params.targetLonDeg
        finalImpactPos = llhToECEF(params.targetLatDeg, params.targetLonDeg, 0)
        pushLog({ time: t, message: `🎯 Применена принудительная точность - удар перенесен в цель` })
      }
      
  const impactLocation = getLocationName(lat, lng)
      
      // Сохраняем ECEF координаты для отладчика
      setLastImpactECEF(finalImpactPos)
      
      pushLog({ time: t, message: `💥 Столкновение! Энергия ~ ${energyMt.toFixed(2)} Мт ТНТ` })
      pushLog({ time: t, message: `📍 ECEF координаты удара: (${impactPos.x.toFixed(0)}, ${impactPos.y.toFixed(0)}, ${impactPos.z.toFixed(0)})` })
      pushLog({ time: t, message: `🌍 Координаты удара: ${lat.toFixed(6)}°, ${lng.toFixed(6)}°` })
      pushLog({ time: t, message: `🗺️ Место удара (оценка офлайн): ${impactLocation}` })
      // Precise reverse geocoding (async) — will append when available
      ;(async () => {
        try {
          const precise = await resolveLocationLabel(lat, lng)
          pushLog({ time: t, message: `📌 Точное место удара: ${precise.label} (источник: ${precise.source})` })
        } catch (e) {
          // ignore
        }
      })()
      
      // Проверяем точность - расстояние между целевой точкой и фактическим ударом
      const targetPos = llhToECEF(params.targetLatDeg, params.targetLonDeg, 0)
      const distance = Math.sqrt(
        Math.pow(finalImpactPos.x - targetPos.x, 2) + 
        Math.pow(finalImpactPos.y - targetPos.y, 2) + 
        Math.pow(finalImpactPos.z - targetPos.z, 2)
      )
      pushLog({ time: t, message: `📏 Расстояние от цели: ${(distance/1000).toFixed(2)} км` })
      pushLog({ time: t, message: `Оценочный диаметр кратера: ${craterData.diameter.toFixed(0)} м` })
      pushLog({ time: t, message: `Глубина кратера: ${craterData.depth.toFixed(0)} м` })
      pushLog({ time: t, message: `Сейсмическая магнитуда: ${seismicData.magnitude.toFixed(1)}` })
      pushLog({ time: t, message: `Избыточное давление (50км): ${(blastData.overpressure/1000).toFixed(1)} кПа` })
      pushLog({ time: t, message: `Дельта-V Земли: ${dV_impact.toExponential(3)} м/с (пренебрежимо)` })
      
      if (initialSpeedMs !== undefined) {
        const speedLoss = Math.max(0, initialSpeedMs - res.speedMs)
        pushLog({ time: t, message: `Потеря скорости при входе: ${speedLoss.toFixed(0)} м/с` })
      }
      if (peakDynamicPressurePa) {
        pushLog({ time: t, message: `Пиковое динамическое давление: ${(peakDynamicPressurePa / 1000).toFixed(0)} кПа` })
      }
      
      // Rough displacement over a day given Earth delta-V (order-of-magnitude)
      const day = 86400
      const disp = dV_impact * day
      pushLog({ time: t, message: `Смещение Земли за 1 сутки из-за dV: ${disp.toExponential(3)} м (оценка)` })
      const impactECEFForViz = forceExactHit ? finalImpactPos : res.body.positionM
      const impactSceneVec = ecefToScene(impactECEFForViz)
      const impactScenePos: [number, number, number] = impactSceneVec.toArray() as [number, number, number]
      setImpactPoint(impactScenePos as any)
  // Save crater metrics for visuals/sinking
  setLastCrater({ diameterM: craterData.diameter, depthM: craterData.depth, rimHeightM: craterData.rimHeight })
      // Compute Earth-local position so crater rotates with Earth
      if (earthRef.current) {
        const worldPos = new THREE.Vector3(...impactScenePos)
        const local = earthRef.current.worldToLocal(worldPos.clone())
        setLocalImpact(local)
      } else {
        setLocalImpact(new THREE.Vector3(...impactScenePos))
      }
      setSimState('impact')
      // Store energy-based visual scales in a ref
      visScalesRef.current.crater = Math.min(0.25, (craterData.diameter / 2) / METER_SCALE)
      visScalesRef.current.shock = Math.min(0.5, Math.max(0.2, Math.sqrt(energyMt) * 0.01))
      visScalesRef.current.explosionPower = Math.min(2.0, Math.max(0.6, Math.cbrt(energyMt) * 0.1))
      setTimeout(() => setSimState('complete'), 100)
    }
  })

  const asteroidPos = useMemo(() => {
    if (!body) return [0, 0, 2] as [number, number, number]
    return ecefToScene(body.positionM).toArray() as [number, number, number]
  }, [body])

  return (
    <>
  {/* Simple minimal lighting */}
  <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      {/* Stars background - conservative settings for performance */}
      <Stars radius={50} depth={20} count={1500} factor={2} saturation={0} fade speed={0} />
      
      {/* Sun direction animates via a top-level useFrame hook */}
      <Suspense fallback={null}>
        {/* Earth: simple by default; optional advanced shader Earth with clouds/atmosphere */}
        {useAdvancedEarth ? (
          <Earth ref={earthRef} scale={[1,1,1]} sunDirRef={sunDirRef} uvOffsetDeg={uvOffsetDeg}>
            {showClouds && <Clouds />}
            {showAtmosphere && <Atmosphere sunDirRef={sunDirRef} />}
            {showGeoGrid && <GeoGrid />}
            {showGeoMarkers && (
              <GeoMarkers
                targetLat={params.targetLatDeg}
                targetLng={params.targetLonDeg}
                impactECEF={forceExactHit ? undefined : (lastResult.current?.body?.positionM)}
                earthRef={earthRef as any}
              />
            )}
            {localImpact && (
              <>
                <Shockwave position={localImpact.toArray() as any} duration={1.4} maxRadius={visScalesRef.current.shock} color="#88ccff" />
                <Shockwave position={localImpact.toArray() as any} duration={1.0} maxRadius={visScalesRef.current.shock * 0.75} color="#ffaa66" />
                <CraterMark position={localImpact.toArray() as any} finalRadius={visScalesRef.current.crater} growTime={2} opacity={0.55} />
                {!simplifyEffects && <DustBillboard position={localImpact.toArray() as any} duration={2.5} maxSize={0.25} />}
              </>
            )}
          </Earth>
        ) : (
          <SimpleEarth ref={earthRef} scale={[1, 1, 1]} uvOffsetDeg={uvOffsetDeg}>
          {showGeoGrid && <GeoGrid />}
          {showGeoMarkers && (
            <GeoMarkers
              targetLat={params.targetLatDeg}
              targetLng={params.targetLonDeg}
              impactECEF={forceExactHit ? undefined : (lastResult.current?.body?.positionM)}
              earthRef={earthRef as any}
            />
          )}
          {localImpact && (
            <>
              {/* Double shockwave for richer look */}
              <Shockwave position={localImpact.toArray() as any} duration={1.4} maxRadius={visScalesRef.current.shock} color="#88ccff" />
              <Shockwave position={localImpact.toArray() as any} duration={1.0} maxRadius={visScalesRef.current.shock * 0.75} color="#ffaa66" />
              <CraterMark position={localImpact.toArray() as any} finalRadius={visScalesRef.current.crater} growTime={2} opacity={0.55} />
              {!simplifyEffects && <DustBillboard position={localImpact.toArray() as any} duration={2.5} maxSize={0.25} />}
            </>
          )}
          </SimpleEarth>
        )}
  {body && <Asteroid position={asteroidPos} diameterM={params.diameterM} meterScale={METER_SCALE} />}
        {/* Debris animation */}
        {debris.map((d) => {
          // advance debris life and position using a tiny kinematics step coupled to render
          const alpha = Math.max(0, d.life)
          const s = 0.003 + 0.006 * alpha
          const color = new THREE.Color('#ffaa66').lerp(new THREE.Color('#444'), 1 - alpha)
          return (
            <mesh key={d.id} position={d.pos.toArray()}>
              <sphereGeometry args={[s, 6, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0.8 * alpha} />
            </mesh>
          )
        })}
        {/* Explosion & particles in world space for glow */}
        {impactPoint && (
          <>
            <Explosion position={impactPoint as any} />
            <ExplosionParticles position={impactPoint as any} power={visScalesRef.current.explosionPower} count={simplifyEffects ? 50 : Math.round(60 * visScalesRef.current.explosionPower + 40)} duration={1.6} />
          </>
        )}
        {/* Trajectory trail */}
        {trajectoryPoints.current.length > 1 && (
          <TrajectoryTrail positions={trajectoryPoints.current} maxLength={20} color="#ffaa00" />
        )}
      </Suspense>
      <OrbitControls enablePan enableZoom enableRotate />
  {/* Optional bloom postprocessing */}
  {enableBloom && <PostFX intensity={bloomIntensity ?? 0.35} threshold={0.9} radius={0.15} selective={!!selectiveBloom} cinematic={!!cinematicMode} exposure={cinematicMode ? 1.1 : 1.0} />}
    </>
  )
}

function ControlsPanel() {
  const { neos, neoPage, setNEOs, appendNEOs, setNEOPage, selectedNEOId, selectNEO, params, updateParams, setBody, setSimState, resetLogs, pushLog, setInitialSpeed, setSimTimeScale, impactTargetSeconds, setImpactTargetSeconds, simplifyEffects, setSimplifyEffects, setImpactPoint, enableBloom, setEnableBloom, bloomIntensity, setBloomIntensity, useAdvancedEarth, setUseAdvancedEarth, showClouds, setShowClouds, showAtmosphere, setShowAtmosphere, clearTrajectoryData, trajectoryData, lastImpactECEF, cinematicMode, setCinematicMode, selectiveBloom, setSelectiveBloom, showGeoGrid, setShowGeoGrid, showGeoMarkers, setShowGeoMarkers } = useScenarioStore()
  const [showMap, setShowMap] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showDebugger, setShowDebugger] = useState(false)
  const [showMethodology, setShowMethodology] = useState(false)
  const [impactData, setImpactData] = useState<{
    lat: number
    lng: number
    craterRadius: number
    blastRadius: number
    seismicRadius: number
  } | null>(null)

  const getHazardLevel = (diameterM: number, speedMs: number) => {
    const energy = 0.5 * (diameterM ** 3) * 2500 * (speedMs ** 2) // Rough kinetic energy
    const energyMt = energy / 4.184e15 // Convert to megatons
    
    if (diameterM >= 1000) {
      return { label: '🔴 ГЛОБАЛЬНАЯ КАТАСТРОФА (>1 км)', color: '#8b0000' }
    } else if (diameterM >= 140) {
      return { label: '🟠 РЕГИОНАЛЬНАЯ КАТАСТРОФА (>140 м)', color: '#ff4500' }
    } else if (diameterM >= 50) {
      return { label: '🟡 ЗНАЧИТЕЛЬНАЯ УГРОЗА (>50 м)', color: '#ffa500' }
    } else if (energyMt >= 1) {
      return { label: '🟡 ПОТЕНЦИАЛЬНО ОПАСНЫЙ (>1 Мт)', color: '#ffd700' }
    } else if (diameterM >= 10) {
      return { label: '🟢 УМЕРЕННАЯ УГРОЗА (>10 м)', color: '#32cd32' }
    } else {
      return { label: '🔵 МИНИМАЛЬНАЯ УГРОЗА (<10 м)', color: '#4169e1' }
    }
  }

  useEffect(() => {
    // Load first page of NEOs on mount
    fetchNEOs(0).then(setNEOs).catch((e) => console.error(e))
    // If URL contains a shared scenario, load it
    const shared = tryParseShareURL(window.location.search)
    if (shared) {
      updateParams(shared.p)
      if (shared.o) {
        if (typeof shared.o.simplifyEffects === 'boolean') setSimplifyEffects(shared.o.simplifyEffects)
        if (typeof shared.o.useAdvancedEarth === 'boolean') setUseAdvancedEarth(shared.o.useAdvancedEarth)
        if (typeof shared.o.showClouds === 'boolean') setShowClouds(shared.o.showClouds)
        if (typeof shared.o.showAtmosphere === 'boolean') setShowAtmosphere(shared.o.showAtmosphere)
      }
      pushLog({ time: 0, message: '📥 Загружен сценарий из ссылки' })
    }
  }, [setNEOs])

  const loadMore = async () => {
    const next = neoPage + 1
    const more = await fetchNEOs(next)
    appendNEOs(more)
    setNEOPage(next)
  }

  const startSim = () => {
    resetLogs()
    setImpactPoint(undefined)
    clearTrajectoryData() // Clear previous trajectory data
    
    // Детальное логирование координат для отладки
    pushLog({ time: 0, message: `🎯 Начальные координаты цели: ${params.targetLatDeg.toFixed(6)}°, ${params.targetLonDeg.toFixed(6)}°` })
    
    // Выбираем между точным прицеливанием и обычным расчетом
    let pos: Vector3, v: Vector3
    
    if (true) {
      pushLog({ time: 0, message: `🔧 Используется точное прицеливание...` })
      const correction = calculateAccurateTrajectory(params)
      pos = correction.correctedPosition
      v = correction.correctedVelocity
      pushLog({ time: 0, message: `📈 Ожидаемое отклонение без коррекции: ${correction.expectedDeviation.toFixed(1)} км` })
      
      // Показать корректированные координаты старта
      const correctedCoords = ecefToLatLng(correction.correctedPosition)
      pushLog({ time: 0, message: `🎯 Скорректированный старт: ${correctedCoords.lat.toFixed(6)}°, ${correctedCoords.lng.toFixed(6)}°` })
    } else {
      // Обычный расчет
      pos = llhToECEF(params.targetLatDeg, params.targetLonDeg, params.entryAltitudeM)
      const frame = localFrame(params.targetLatDeg, params.targetLonDeg)
      const angleRad = (params.angleDeg * Math.PI) / 180
      const vHoriz = Math.cos(angleRad) * params.entrySpeedMs
      const vDown = Math.sin(angleRad) * params.entrySpeedMs
      v = {
        x: frame.e.x * vHoriz + frame.u.x * -vDown,
        y: frame.e.y * vHoriz + frame.u.y * -vDown,
        z: frame.e.z * vHoriz + frame.u.z * -vDown,
      }
    }
    
    pushLog({ time: 0, message: `📍 ECEF координаты старта: (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})` })
    
    // Обратная проверка точности преобразования
    const verifyCoords = ecefToLatLng(pos)
    const latError = Math.abs(verifyCoords.lat - params.targetLatDeg)
    const lngError = Math.abs(verifyCoords.lng - params.targetLonDeg)
    pushLog({ time: 0, message: `✅ Проверка: lat=${verifyCoords.lat.toFixed(6)}°, lng=${verifyCoords.lng.toFixed(6)}°` })
    pushLog({ time: 0, message: `📏 Ошибка преобразования: lat=${latError.toFixed(8)}°, lng=${lngError.toFixed(8)}°` })
    setBody(undefined) // clear any previous
    setBody({ 
      massKg: params.massKg, 
      diameterM: params.diameterM, 
      positionM: pos, 
      velocityMs: v,
      asteroidType: params.asteroidType
    })
    setInitialSpeed(Math.hypot(v.x, v.y, v.z))
    
    // Predict trajectory and impact
    const prediction = predictTrajectory({ 
      massKg: params.massKg, 
      diameterM: params.diameterM, 
      positionM: pos, 
      velocityMs: v,
      asteroidType: params.asteroidType
    })
    
    if (prediction.impactPoint) {
      pushLog({ time: 0, message: `Предсказанное время до удара: ${prediction.timeToImpact.toFixed(1)}с` })
      pushLog({ time: 0, message: `Максимальное динамическое давление: ${(prediction.maxDynamicPressure/1e6).toFixed(1)} МПа` })
      
      // Calculate impact consequences for map visualization
      const kineticEnergy = 0.5 * params.massKg * Math.pow(Math.hypot(v.x, v.y, v.z), 2)
      const impactEnergy = impactEnergyMtTNT(kineticEnergy)
      const craterInfo = calculateCraterDiameter(impactEnergy)
      
      // Calculate damage radii by finding distances where effects drop to threshold levels
      let blastRadius = 1 // km, minimum
      let seismicRadius = 10 // km, minimum
      
      // Find blast radius where overpressure drops to 1000 Pa (building damage threshold)
      for (let dist = 1; dist <= 100; dist += 1) {
        const blast = calculateBlastEffects(impactEnergy, dist)
        if (blast.overpressure < 1000) {
          blastRadius = dist * 1000 // convert to meters
          break
        }
      }
      
      // Find seismic radius where intensity drops to level 3 (felt by many)
      for (let dist = 1; dist <= 1000; dist += 10) {
        const seismic = calculateSeismicEffects(impactEnergy, dist)
        if (seismic.intensity < 3) {
          seismicRadius = dist * 1000 // convert to meters
          break
        }
      }
      
      setImpactData({
        lat: params.targetLatDeg,
        lng: params.targetLonDeg,
        craterRadius: craterInfo.diameter / 2, // radius in meters
        blastRadius: blastRadius,
        seismicRadius: seismicRadius
      })
    } else {
      pushLog({ time: 0, message: 'Астероид не достигнет поверхности' })
      setImpactData(null)
    }
    // Rough estimate time to impact and calibrate visual time scale to hit ~5s
    // Project velocity along local down vector to estimate approach rate
    const targetFrame = localFrame(params.targetLatDeg, params.targetLonDeg)
    const downRate = Math.max(1, Math.abs(v.x * targetFrame.u.x + v.y * targetFrame.u.y + v.z * targetFrame.u.z)) // m/s (avoid div by 0)
    const radial = Math.sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z)
    const distanceToSurface = Math.max(0, radial - R_EARTH)
  const estTimeToImpact = Math.max(1, distanceToSurface / downRate) // seconds
  const targetRealSeconds = impactTargetSeconds ?? 5
    // Base visual scale for stability; capped to avoid extreme speeds
    const baseScale = 0.15
    let scale = baseScale * (estTimeToImpact / targetRealSeconds)
    scale = Math.min(Math.max(scale, 0.05), 0.6)
    setSimTimeScale(scale)
    pushLog({ time: 0, message: `Калибровка времени: визуальный масштаб ≈ ${scale.toFixed(2)} (оценка t_impact ≈ ${estTimeToImpact.toFixed(1)}с)` })
    setSimState('running')
    pushLog({ time: 0, message: 'Симуляция запущена' })
  }

  const saveChanges = () => {
    // No persistent backend; simply log for now
    pushLog({ time: 0, message: 'Параметры сохранены локально' })
  }

  // Preset functionality removed per request

  // Repeat button removed per request

  return (
    <div className="controls">
      <div className="row">
        <label>
          Астероид из NASA (NEO):
          <select value={selectedNEOId ?? ''} onChange={(e) => selectNEO(e.target.value)}>
            <option value="">-- Select --</option>
            {neos.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} (~{Math.round(n.estimated_diameter_m)} m)
              </option>
            ))}
          </select>
        </label>
        <Tooltip content="Подгрузить следующую страницу околоземных объектов из NASA API.">
          <button className="btn btn-info" onClick={loadMore}>Загрузить ещё</button>
        </Tooltip>
      </div>
      <div className="grid">
        <label>
          Масса (кг)
          <Tooltip content="Масса астероида влияет на кинетическую энергию и глубину проникновения. Указывается в килограммах.">
            <input type="number" value={Math.round(params.massKg)} onChange={(e) => updateParams({ massKg: Number(e.target.value) })} />
          </Tooltip>
        </label>
        <label>
          Диаметр (м)
          <Tooltip content="Эффективный диаметр тела. Используется для расчёта площади сечения и энергии.">
            <input type="number" value={params.diameterM} onChange={(e) => updateParams({ diameterM: Number(e.target.value) })} />
          </Tooltip>
        </label>
        <label>
          Тип астероида
          <Tooltip content="Материал определяет плотность и прочность на фрагментацию. Железные тела прочнее и тяжелее.">
            <select value={params.asteroidType} onChange={(e) => updateParams({ asteroidType: e.target.value as any })}>
            <option value="rocky">🪨 Каменный (S-класс)</option>
            <option value="iron">⚙️ Железный (M-класс)</option>
            <option value="icy">🧊 Ледяной (C-класс)</option>
            <option value="carbon">🏴 Углеродистый (C-класс)</option>
            </select>
          </Tooltip>
        </label>
        <div style={{ 
          padding: '8px', 
          borderRadius: '4px', 
          backgroundColor: getHazardLevel(params.diameterM, params.entrySpeedMs).color,
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {getHazardLevel(params.diameterM, params.entrySpeedMs).label}
        </div>
        <label>
          Скорость входа (м/с)
          <Tooltip content="Начальная скоростЬ при входе в атмосферу. Большая скорость увеличивает энергию удара и тепловыделение.">
            <input type="number" value={params.entrySpeedMs} onChange={(e) => updateParams({ entrySpeedMs: Number(e.target.value) })} />
          </Tooltip>
        </label>
        <label>
          Высота входа (м)
          <Tooltip content="Высота над уровнем моря, где начинается симуляция входа. Влияет на время до удара.">
            <input type="number" value={params.entryAltitudeM} onChange={(e) => updateParams({ entryAltitudeM: Number(e.target.value) })} />
          </Tooltip>
        </label>
        <label>
          Целевая широта (°)
          <Tooltip content="Широта точки прицеливания на поверхности Земли (WGS84).">
            <input type="number" value={params.targetLatDeg} onChange={(e) => updateParams({ targetLatDeg: Number(e.target.value) })} />
          </Tooltip>
        </label>
        <label>
          Целевая долгота (°)
          <Tooltip content="Долгота точки прицеливания на поверхности Земли (WGS84).">
            <input type="number" value={params.targetLonDeg} onChange={(e) => updateParams({ targetLonDeg: Number(e.target.value) })} />
          </Tooltip>
        </label>
        <label>
          Угол входа (°)
          <Tooltip content="Угол между горизонталью и направлением движения. Больший угол — круче траектория.">
            <input type="number" value={params.angleDeg} onChange={(e) => updateParams({ angleDeg: Number(e.target.value) })} />
          </Tooltip>
        </label>
        <label>
          Время до удара (с)
          <Tooltip content="Желаемое время реального мира до удара для визуализации. Автоматически подстраивает скорость покадрово.">
            <input type="number" value={impactTargetSeconds ?? 5} onChange={(e) => setImpactTargetSeconds(Number(e.target.value) || 5)} />
          </Tooltip>
        </label>
      </div>
      <div className="row">
        <Tooltip content="Сохранить текущие параметры в памяти сеанса (без сервера).">
          <button className="btn btn-secondary" onClick={saveChanges}>Сохранить изменения</button>
        </Tooltip>
        <Tooltip content="Запустить симуляцию со всеми текущими параметрами и визуализацией.">
          <button className="btn btn-accent" onClick={startSim}>Запустить симуляцию</button>
        </Tooltip>
        <Tooltip content="Сбросить и выбрать параметры заново (перезагрузка страницы).">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Заново выбрать параметры</button>
        </Tooltip>
        <Tooltip content="Скопировать ссылку с текущим сценарием. Откройте её на другом устройстве — параметры загрузятся автоматически.">
          <span><ShareScenario className="btn btn-success" onShared={(url) => console.debug('Shared URL:', url)} /></span>
        </Tooltip>
        <Tooltip content="Описание использованных моделей: геодезия WGS84, расстояния Vincenty, аэродинамика, фрагментация и проверки точности.">
          <button className="btn btn-secondary" onClick={() => setShowMethodology(true)}>Методология</button>
        </Tooltip>
        <Tooltip content="Открыть интерактивную карту воздействия (кратер, ударная волна, сейсм.)">
          <button className="btn btn-primary" onClick={() => setShowMap(!showMap)}>
          {showMap ? 'Скрыть карту' : 'Показать карту воздействия'}
          </button>
        </Tooltip>
        <Tooltip content="Графики профиля полёта: высота, скорость, q, тепловой поток и т.п.">
          <button className="btn btn-secondary" onClick={() => setShowDashboard(!showDashboard)}>
          {showDashboard ? 'Скрыть дашборд' : 'Показать аналитику'}
          </button>
        </Tooltip>
        <Tooltip content="Экспорт отчёта по сценарию: параметры, результаты и графики (PDF/JSON).">
          <button className="btn btn-success" onClick={() => setShowExport(!showExport)}>
          {showExport ? 'Скрыть экспорт' : 'Экспорт данных'}
          </button>
        </Tooltip>
        <Tooltip content="Исторические события ударов: справка и сравнения с вашим сценарием.">
          <button className="btn btn-warning" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? 'Скрыть историю' : 'Исторические события'}
          </button>
        </Tooltip>
        <Tooltip content="Подробная проверка координат: преобразования LLA↔ECEF, расстояния и сходимость.">
          <button className="btn btn-danger" onClick={() => setShowDebugger(!showDebugger)}>
          {showDebugger ? 'Скрыть отладчик' : 'Отладчик координат'}
          </button>
        </Tooltip>
      </div>
      <div className="row">
        <label>
          Упростить эффекты
          <Tooltip content="Отключает тяжёлые визуальные эффекты (частицы/свечение) для экономии ресурсов.">
            <input type="checkbox" checked={!!simplifyEffects} onChange={(e) => setSimplifyEffects(e.target.checked)} />
          </Tooltip>
        </label>
        {/* Targeting toggles removed per request. Features remain enabled in code defaults. */}
        <label style={{ marginLeft: 12 }}>
          Продвинутая Земля
          <Tooltip content="Включает детализированную модель Земли (шейдер, облака, атмосфера). Требовательнее к GPU.">
            <input type="checkbox" checked={!!useAdvancedEarth} onChange={(e) => setUseAdvancedEarth(e.target.checked)} />
          </Tooltip>
        </label>
        <label style={{ marginLeft: 12 }}>
          Облака
          <Tooltip content="Добавляет слой облаков поверх Земли. Доступно в режиме 'Продвинутая Земля'.">
            <input type="checkbox" checked={!!showClouds} onChange={(e) => setShowClouds(e.target.checked)} disabled={!useAdvancedEarth} />
          </Tooltip>
        </label>
        <label style={{ marginLeft: 12 }}>
          Атмосфера
          <Tooltip content="Светорассеяние и сияние атмосферы. Доступно в режиме 'Продвинутая Земля'.">
            <input type="checkbox" checked={!!showAtmosphere} onChange={(e) => setShowAtmosphere(e.target.checked)} disabled={!useAdvancedEarth} />
          </Tooltip>
        </label>
        <label style={{ marginLeft: 12 }}>
          🎬 Cinematic
          <Tooltip content="ACES tone mapping, мягкий виньет и настроенный bloom для презентаций.">
            <input type="checkbox" checked={!!cinematicMode} onChange={(e) => setCinematicMode(e.target.checked)} />
          </Tooltip>
        </label>
        <label style={{ marginLeft: 12 }}>
          ✨ Selective Bloom
          <Tooltip content="Свечение применяется только к ярким эффектам (астероид/взрыв/шоковая волна).">
            <input type="checkbox" checked={!!selectiveBloom} onChange={(e) => setSelectiveBloom(e.target.checked)} />
          </Tooltip>
        </label>
        <label style={{ marginLeft: 12 }}>
          Геосетка
          <Tooltip content="Отображает сетку широт и долгот для проверки выравнивания текстур и координат.">
            <input type="checkbox" checked={!!showGeoGrid} onChange={(e) => setShowGeoGrid(e.target.checked)} />
          </Tooltip>
        </label>
        <label style={{ marginLeft: 12 }}>
          Геомаркеры
          <Tooltip content="Пины: цель, моментальный удар, и Гринвич для визуальной верификации.">
            <input type="checkbox" checked={!!showGeoMarkers} onChange={(e) => setShowGeoMarkers(e.target.checked)} />
          </Tooltip>
        </label>
        <label style={{ marginLeft: 12 }}>
          Bloom
          <Tooltip content="Эффект свечения ярких областей (постобработка). Может снижать производительность.">
            <input type="checkbox" checked={!!enableBloom} onChange={(e) => setEnableBloom(e.target.checked)} />
          </Tooltip>
        </label>
        <label style={{ marginLeft: 12 }}>
          Яркость Bloom
          <Tooltip content="Интенсивность эффекта свечения. Используйте осторожно, чтобы избежать засветки.">
            <input type="range" min={0} max={1} step={0.05} value={bloomIntensity ?? 0.35} onChange={(e) => setBloomIntensity(Number(e.target.value))} />
          </Tooltip>
        </label>
      </div>
      {showMap && (
        <div style={{ marginTop: 20 }}>
          <h3>Интерактивная карта воздействия</h3>
          <div style={{ height: '400px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <ImpactMap
              location={[params.targetLatDeg, params.targetLonDeg]}
              onLocationChange={(lat, lng) => {
                updateParams({ targetLatDeg: lat, targetLonDeg: lng })
                pushLog({ time: 0, message: `Новая цель: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°` })
              }}
              impactData={impactData}
            />
          </div>
        </div>
      )}
      
      <AnalyticsDashboard
        trajectoryData={trajectoryData}
        impactConsequences={impactData ? {
          energyMt: 0, // Will be calculated in physics
          craterDiameter: impactData.craterRadius * 2,
          craterDepth: impactData.craterRadius * 0.13, // Rough approximation
          seismicMagnitude: 0, // Will be calculated
          blastRadius: impactData.blastRadius
        } : null}
        asteroidType={params.asteroidType}
        initialMass={params.massKg}
        isVisible={showDashboard}
      />
      
      <DataExport
        data={{
          scenarioParams: params,
          trajectoryData,
          impactResults: impactData ? {
            energyMt: 0, // Will be calculated from physics
            craterDiameter: impactData.craterRadius * 2,
            craterDepth: impactData.craterRadius * 0.13,
            seismicMagnitude: 0, // Will be calculated
            blastRadius: impactData.blastRadius
          } : undefined,
          timestamp: new Date().toISOString()
        }}
        isVisible={showExport}
      />
      
      <HistoricalEvents isVisible={showHistory} />
  <MethodologyModal open={showMethodology} onClose={() => setShowMethodology(false)} />
      
      {showDebugger && params.targetLatDeg !== undefined && params.targetLonDeg !== undefined && (
        <CoordinateDebugger 
          targetLat={params.targetLatDeg}
          targetLng={params.targetLonDeg}
          actualImpactECEF={lastImpactECEF}
          isVisible={showDebugger}
        />
      )}
    </div>
  )
}

function Logs() {
  const { logs } = useScenarioStore()
  return (
    <div className="logs">
  <h3>Логи симуляции</h3>
      <div className="loglist">
        {logs.map((l, i) => (
          <div key={i} className="log">
            <span className="time">t={l.time.toFixed(1)}s</span> {l.message}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>METEOR MADNESS — ASTEROID IMPACT SIMULATOR</h1>
        <div className="status">
          <span className="chip live">SYSTEM ONLINE</span>
          <span className="chip">WGS84</span>
          <span className="chip">R3F</span>
        </div>
      </header>
      <div className="panel"><ControlsPanel /></div>
      <div className="panel viewport">
        <ErrorBoundary>
          <Canvas 
            shadows={false} // Disable shadows completely
            dpr={[1, 1.5]}
            gl={{ 
              antialias: false,
              powerPreference: "low-power", // Use low power mode
              alpha: false,
              stencil: false,
              depth: true,
              preserveDrawingBuffer: false,
              failIfMajorPerformanceCaveat: false
            }} 
            camera={{ position: [0, 2.2, 3.2], fov: 50 }} 
            onCreated={({ scene, gl }) => {
              scene.background = new THREE.Color('#05070a')
              // Disable fog for performance
              // scene.fog = new THREE.Fog('#05070a', 10, 60)
              gl.outputColorSpace = THREE.SRGBColorSpace
              // Tone mapping is controlled by cinematic toggle via effect choice if needed
              
              // Handle WebGL context loss
              const canvas = gl.domElement
              canvas.addEventListener('webglcontextlost', (event) => {
                console.warn('WebGL context lost - preventing default behavior')
                event.preventDefault()
              })
              
              canvas.addEventListener('webglcontextrestored', () => {
                console.log('WebGL context restored')
                // Force scene refresh
                gl.resetState()
              })
            }}>
            <Scene />
          </Canvas>
        </ErrorBoundary>
      </div>
      <div className="panel"><Logs /></div>
    </div>
  )
}
