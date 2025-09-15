import { create } from 'zustand'
import type { NEO } from '../services/nasa'
import type { Body, Vector3 } from '../utils/physics'

export type ScenarioParams = {
	massKg: number
	diameterM: number
	entrySpeedMs: number
	entryAltitudeM: number
	targetLatDeg: number
	targetLonDeg: number
	angleDeg: number
	asteroidType: 'rocky' | 'iron' | 'icy' | 'carbon'
}

export type LogEntry = { time: number; message: string }

export type TrajectoryDataPoint = {
	time: number
	altitude: number
	velocity: number
	dynamicPressure: number
	heatFlux: number
	temperature: number
	mass: number
}

type SimState = 'idle' | 'running' | 'impact' | 'complete'

type State = {
	neos: NEO[]
	neoPage: number
	selectedNEOId?: string
	params: ScenarioParams
	simState: SimState
	t: number
	logs: LogEntry[]
	body?: Body
	impactPoint?: Vector3
	initialSpeedMs?: number
	peakDynamicPressurePa?: number
	peakHeatFluxWm2?: number
	impactEnergyJ?: number
	simTimeScale?: number
	impactTargetSeconds?: number
	simplifyEffects?: boolean
	enableBloom?: boolean
	bloomIntensity?: number
	useAdvancedEarth?: boolean
	showClouds?: boolean
	showAtmosphere?: boolean
	trajectoryData: TrajectoryDataPoint[]
	lastImpactECEF?: { x: number, y: number, z: number }
	lastCrater?: { diameterM: number, depthM: number, rimHeightM: number }
	accurateTargeting?: boolean
	forceExactHit?: boolean
	cinematicMode?: boolean
	selectiveBloom?: boolean
	uvOffsetDeg?: number
	showGeoGrid?: boolean
	showGeoMarkers?: boolean
	
	setNEOs: (neos: NEO[]) => void
	appendNEOs: (neos: NEO[]) => void
	setNEOPage: (p: number) => void
	selectNEO: (id?: string, override?: Partial<ScenarioParams>) => void
	updateParams: (p: Partial<ScenarioParams>) => void
	resetLogs: () => void
	pushLog: (e: LogEntry) => void
	setBody: (b?: Body) => void
	setSimState: (s: SimState) => void
	setTime: (t: number) => void
	setImpactPoint: (p?: Vector3) => void
	setInitialSpeed: (v?: number) => void
	setPeakDynamicPressure: (q?: number) => void
	setPeakHeatFlux: (h?: number) => void
	setImpactEnergy: (e?: number) => void
	setSimTimeScale: (s?: number) => void
	setImpactTargetSeconds: (s?: number) => void
	setSimplifyEffects: (v: boolean) => void
	setEnableBloom: (v: boolean) => void
	setBloomIntensity: (v: number) => void
	setUseAdvancedEarth: (v: boolean) => void
	setShowClouds: (v: boolean) => void
	setShowAtmosphere: (v: boolean) => void
	addTrajectoryPoint: (point: TrajectoryDataPoint) => void
	clearTrajectoryData: () => void
	setLastImpactECEF: (pos: { x: number, y: number, z: number }) => void
	setLastCrater: (c: { diameterM: number, depthM: number, rimHeightM: number }) => void
	setAccurateTargeting: (v: boolean) => void
	setForceExactHit: (v: boolean) => void
	setCinematicMode: (v: boolean) => void
	setSelectiveBloom: (v: boolean) => void
	setUvOffsetDeg: (v: number) => void
	setShowGeoGrid: (v: boolean) => void
	setShowGeoMarkers: (v: boolean) => void
}

export const useScenarioStore = create<State>((set, get) => ({
	neos: [],
	neoPage: 0,
	params: {
		massKg: 1e9,
		diameterM: 100,
		entrySpeedMs: 20_000,
		entryAltitudeM: 120_000,
		targetLatDeg: 0,
		targetLonDeg: 0,
		angleDeg: 45,
		asteroidType: 'rocky',
	},
	simState: 'idle',
	t: 0,
	logs: [],
	trajectoryData: [],
	impactTargetSeconds: 5,
	simplifyEffects: false,
	enableBloom: false,
	bloomIntensity: 0.35,
	useAdvancedEarth: false,
	showClouds: false,
	showAtmosphere: false,
	accurateTargeting: true, // Включаем точное прицеливание по умолчанию
	forceExactHit: true, // Принудительная точность включена по умолчанию
	cinematicMode: false,
	selectiveBloom: true,
	uvOffsetDeg: 0,
	showGeoGrid: false,
	showGeoMarkers: false,

	setNEOs: (neos) => set({ neos }),
	appendNEOs: (neos) => set((s) => ({ neos: [...s.neos, ...neos] })),
	setNEOPage: (p) => set({ neoPage: p }),
	selectNEO: (id, override) => {
		set({ selectedNEOId: id })
		if (!id) return
		const neo = get().neos.find((n) => n.id === id)
		if (neo) {
			set((s) => ({
				params: {
					...s.params,
					diameterM: neo.estimated_diameter_m ?? s.params.diameterM,
					massKg:
						override?.massKg ??
						(4 / 3) * Math.PI * Math.pow((neo.estimated_diameter_m ?? s.params.diameterM) / 2, 3) * 3000,
					...override,
				},
			}))
		}
	},
	updateParams: (p) => set((s) => ({ params: { ...s.params, ...p } })),
	resetLogs: () => set({ logs: [] }),
	pushLog: (e) => set((s) => ({ logs: [...s.logs, e] })),
	setBody: (b) => set({ body: b }),
	setSimState: (simState) => set({ simState }),
	setTime: (t) => set({ t }),
	setImpactPoint: (p) => set({ impactPoint: p }),
	setInitialSpeed: (v) => set({ initialSpeedMs: v }),
	setPeakDynamicPressure: (q) => set({ peakDynamicPressurePa: q }),
	setPeakHeatFlux: (h) => set({ peakHeatFluxWm2: h }),
	setImpactEnergy: (e) => set({ impactEnergyJ: e }),
	setSimTimeScale: (s) => set({ simTimeScale: s }),
	setImpactTargetSeconds: (s) => set({ impactTargetSeconds: s }),
	setSimplifyEffects: (v) => set({ simplifyEffects: v }),
	setEnableBloom: (v) => set({ enableBloom: v }),
	setBloomIntensity: (v) => set({ bloomIntensity: v }),
	setUseAdvancedEarth: (v) => set({ useAdvancedEarth: v }),
	setShowClouds: (v) => set({ showClouds: v }),
	setShowAtmosphere: (v) => set({ showAtmosphere: v }),
	addTrajectoryPoint: (point) => set((s) => ({ 
		trajectoryData: [...s.trajectoryData, point] 
	})),
	clearTrajectoryData: () => set({ trajectoryData: [] }),
	setLastImpactECEF: (pos) => set({ lastImpactECEF: pos }),
	setLastCrater: (c) => set({ lastCrater: c }),
	setAccurateTargeting: (v) => set({ accurateTargeting: v }),
	setForceExactHit: (v) => set({ forceExactHit: v }),
	setCinematicMode: (v) => set({ cinematicMode: v }),
	setSelectiveBloom: (v) => set({ selectiveBloom: v }),
	setUvOffsetDeg: (v) => set({ uvOffsetDeg: v }),
	setShowGeoGrid: (v) => set({ showGeoGrid: v }),
	setShowGeoMarkers: (v) => set({ showGeoMarkers: v }),
}))

// Re-exported for backward compatibility
export { llhToECEF, localFrame } from '../utils/geodesy'
