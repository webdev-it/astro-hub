// Simple physics helpers for asteroid entry and impact. This is intentionally
// simplified for realtime visualization and educational purposes.

import { llhToECEF, localFrame } from '../utils/geodesy'
import { ecefToLatLng } from '../utils/geodesy'

export type Vector3 = { x: number; y: number; z: number }

export const G = 6.67430e-11 // gravitational constant (m^3 kg^-1 s^-2)
export const M_EARTH = 5.972e24 // kg
export const R_EARTH = 6_371_000 // m
export const SEA_LEVEL_AIR_DENSITY = 1.225 // kg/m^3
export const SCALE_HEIGHT = 8500 // m (atmospheric scale height)
// Earth rotation rate (rad/s)
export const OMEGA_EARTH = 7.2921150e-5

// Asteroid composition types
export type AsteroidType = 'rocky' | 'iron' | 'icy' | 'carbon'

export type AsteroidProperties = {
	type: AsteroidType
	density: number // kg/m^3
	strength: number // Pa (tensile strength)
	ablationCoeff: number // ablation coefficient
	dragCoeff: number // drag coefficient
}

export const ASTEROID_TYPES: Record<AsteroidType, AsteroidProperties> = {
	rocky: {
		type: 'rocky',
		density: 3000,
		strength: 1e8, // 100 MPa
		ablationCoeff: 1e-9,
		dragCoeff: 1.3
	},
	iron: {
		type: 'iron',
		density: 7800,
		strength: 5e8, // 500 MPa
		ablationCoeff: 5e-10,
		dragCoeff: 1.1
	},
	icy: {
		type: 'icy',
		density: 1000,
		strength: 1e6, // 1 MPa
		ablationCoeff: 5e-9,
		dragCoeff: 1.4
	},
	carbon: {
		type: 'carbon',
		density: 2200,
		strength: 5e7, // 50 MPa
		ablationCoeff: 2e-9,
		dragCoeff: 1.35
	}
}

export type Body = {
	massKg: number
	diameterM: number
	positionM: Vector3 // meters in an Earth-centered frame for viz purposes
	velocityMs: Vector3 // m/s
	asteroidType?: AsteroidType
	dragCoeff?: number // default from asteroid type
	areaMultiplier?: number // >1 if fragmented
	fragmented?: boolean
	fragmentCount?: number // number of fragments
	strength?: number // current strength (reduced by thermal stress)
}

export type StepContext = {
	dt: number // seconds
	attitudeFactor?: number // 0..1 effective cross section factor
	ablationCoeff?: number // kg per (J/m^2), effective since we use heat flux * area
	materialDensityKgM3?: number // for diameter update from mass, default 3000
}

export type StepResult = {
	body: Body
	dynamicPressurePa: number
	altitudeM: number
	speedMs: number
	energyJ: number
	heatFluxWm2: number
	massLossKg: number
	temperatureK?: number
	fragmentationOccurred?: boolean
}

export function vecLen(v: Vector3) {
	return Math.hypot(v.x, v.y, v.z)
}

export function vecAdd(a: Vector3, b: Vector3): Vector3 {
	return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function vecScale(a: Vector3, s: number): Vector3 {
	return { x: a.x * s, y: a.y * s, z: a.z * s }
}

export function vecSub(a: Vector3, b: Vector3): Vector3 {
	return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function normalize(a: Vector3): Vector3 {
	const l = vecLen(a)
	if (l === 0) return { x: 0, y: -1, z: 0 }
	return vecScale(a, 1 / l)
}

export function airDensityAtAltitude(altitudeM: number): number {
	if (altitudeM <= 0) return SEA_LEVEL_AIR_DENSITY
	
	// More accurate atmospheric model with different layers
	if (altitudeM <= 11000) {
		// Troposphere: linear temperature decrease
		const T = 288.15 - 0.0065 * altitudeM // K
		const p = 101325 * Math.pow(T / 288.15, 5.256) // Pa
		return p / (287.05 * T) // kg/m^3
	} else if (altitudeM <= 25000) {
		// Lower stratosphere: constant temperature
		const p = 22632 * Math.exp(-(altitudeM - 11000) / 6341.6)
		return p / (287.05 * 216.65)
	} else if (altitudeM <= 47000) {
		// Upper stratosphere: temperature increase
		const T = 216.65 + 0.001 * (altitudeM - 25000)
		const p = 2488.66 * Math.pow(T / 216.65, -34.163)
		return p / (287.05 * T)
	} else {
		// Above 47km: exponential decay (simplified)
		return SEA_LEVEL_AIR_DENSITY * Math.exp(-altitudeM / 7000)
	}
}

export function airTemperatureAtAltitude(altitudeM: number): number {
	// Returns temperature in Kelvin
	if (altitudeM <= 11000) {
		return 288.15 - 0.0065 * altitudeM
	} else if (altitudeM <= 25000) {
		return 216.65
	} else if (altitudeM <= 47000) {
		return 216.65 + 0.001 * (altitudeM - 25000)
	} else {
		return Math.max(180, 270.65 - 0.0028 * (altitudeM - 47000))
	}
}

export function crossSectionArea(diameterM: number, attitudeFactor = 1) {
	const r = (diameterM / 2) * Math.sqrt(attitudeFactor)
	return Math.PI * r * r
}

export function gravityAccelAtPos(pos: Vector3): Vector3 {
	const r = vecLen(pos)
	const dir = vecScale(pos, -1 / r) // towards origin
	const g = (G * M_EARTH) / (r * r)
	return vecScale(dir, g)
}

export function stepAtmosphericEntry(body: Body, ctx: StepContext): StepResult {
	const { dt } = ctx
	const r = vecLen(body.positionM)
	const altitude = Math.max(0, r - R_EARTH)
	const rho = airDensityAtAltitude(altitude)
	const temp = airTemperatureAtAltitude(altitude)
	
	// Get asteroid properties
	const asteroidProps = body.asteroidType ? ASTEROID_TYPES[body.asteroidType] : {
		density: 3000,
		strength: 1e8,
		ablationCoeff: 1e-9,
		dragCoeff: 1.3
	}
	
		const cd = body.dragCoeff ?? asteroidProps.dragCoeff
		const area = crossSectionArea(body.diameterM * Math.sqrt(body.areaMultiplier ?? 1), ctx.attitudeFactor ?? 1)

		// Atmosphere co-rotates with Earth: air velocity = ω × r (ECEF)
		const omega = { x: 0, y: 0, z: OMEGA_EARTH } as Vector3
		const airVel = {
			x: omega.y * body.positionM.z - omega.z * body.positionM.y,
			y: omega.z * body.positionM.x - omega.x * body.positionM.z,
			z: omega.x * body.positionM.y - omega.y * body.positionM.x,
		}
		const relVel = vecSub(body.velocityMs, airVel)
		const relSpeed = vecLen(relVel)

		// Drag force based on relative speed to air
		const Fd = 0.5 * rho * relSpeed * relSpeed * cd * area
		const dragAccMag = Fd / body.massKg
		const vDir = relSpeed > 0 ? vecScale(relVel, -1 / relSpeed) : { x: 0, y: 0, z: 0 }
		const aDrag = vecScale(vDir, dragAccMag)

	// Gravity towards Earth center
	const aGrav = gravityAccelAtPos(body.positionM)

	// Integrate (semi-implicit Euler)
	const aTotal = vecAdd(aGrav, aDrag)
	const newVel = vecAdd(body.velocityMs, vecScale(aTotal, dt))
	const newPos = vecAdd(body.positionM, vecScale(newVel, dt))

		const speed = vecLen(newVel)
		const energy = 0.5 * body.massKg * speed * speed
		const q = 0.5 * rho * relSpeed * relSpeed // dynamic pressure Pa (relative to air)

	// More accurate heat flux calculation
		const stagnationTemp = temp + (relSpeed * relSpeed) / (2 * 1005) // adiabatic heating
	const heatTransferCoeff = 0.5 * Math.sqrt(rho / (R_EARTH / 1000)) // simplified Sutton-Graves
		const heatFlux = heatTransferCoeff * Math.sqrt(rho) * Math.pow(relSpeed, 3) // W/m^2

	// Improved ablation model
	const ablationCoeff = asteroidProps.ablationCoeff
	let massLoss = 0
	let newMass = body.massKg
	let newDiameter = body.diameterM
	let newStrength = body.strength ?? asteroidProps.strength
	
	if (ablationCoeff > 0 && altitude < 150_000 && speed > 100) {
		// Mass loss due to ablation
		massLoss = Math.max(0, ablationCoeff * heatFlux * area * dt)
		massLoss = Math.min(massLoss, body.massKg * 0.05) // cap per step
		newMass = Math.max(0.1, body.massKg - massLoss)
		
		// Update diameter assuming constant material density
		const rhoMat = asteroidProps.density
		const vol = newMass / rhoMat
		newDiameter = 2 * Math.cbrt((3 * vol) / (4 * Math.PI))
		
		// Thermal stress reduces strength
		const thermalStress = heatFlux / 1e6 // simplified thermal stress in MPa
		newStrength = Math.max(newStrength * 0.9, newStrength - thermalStress * 1e6)
	}

	// Check for fragmentation based on dynamic pressure vs strength
	let fragmentationOccurred = false
	let fragmentCount = body.fragmentCount ?? 1
	let areaMultiplier = body.areaMultiplier ?? 1
	
	if (!body.fragmented && q > newStrength) {
		fragmentationOccurred = true
		// Number of fragments based on excess stress
		const stressRatio = q / newStrength
		fragmentCount = Math.min(10, Math.floor(2 + stressRatio))
		areaMultiplier = Math.sqrt(fragmentCount) * 1.5 // increased drag due to fragmentation
	}

	return {
		body: { 
			...body, 
			positionM: newPos, 
			velocityMs: newVel, 
			massKg: newMass, 
			diameterM: newDiameter,
			strength: newStrength,
			fragmented: body.fragmented || fragmentationOccurred,
			fragmentCount,
			areaMultiplier
		},
		dynamicPressurePa: q,
		altitudeM: altitude,
		speedMs: speed,
		energyJ: energy,
		heatFluxWm2: heatFlux,
		massLossKg: massLoss,
		temperatureK: stagnationTemp,
		fragmentationOccurred
	}
}

export function impactEnergyMtTNT(energyJ: number) {
	// 1 megaton TNT ≈ 4.184e15 J
	return energyJ / 4.184e15
}

export function simpleCraterDiameter(energyMt: number): number {
	// Very rough scaling: D ~ 1.8 * E^(1/3) km for rocky surface
	// Return in meters
	return 1800 * Math.cbrt(Math.max(energyMt, 0))
}

export function earthImpulseDeltaV(energyJ: number): number {
	// Extremely tiny effect; approximate by transferring a fraction of momentum to Earth.
	// p ~ sqrt(2*m*E). dv = p / M_earth with a reduction factor for coupling (~1e-6).
	const coupling = 1e-6
	const mProxy = 1e9 // arbitrary proxy mass for momentum scale
	const p = Math.sqrt(2 * mProxy * Math.max(energyJ, 0)) * coupling
	return p / M_EARTH
}

// Predict trajectory and impact point
export function predictTrajectory(body: Body, steps: number = 4000): {
	trajectory: Vector3[]
	impactPoint: Vector3 | null
	timeToImpact: number
	maxDynamicPressure: number
} {
	let currentBody = { ...body }
	const trajectory: Vector3[] = []
	let timeToImpact = 0
	let maxDynamicPressure = 0

	let i = 0
	while (i < steps) {
		// Adaptive timestep by altitude
		const rNow = vecLen(currentBody.positionM)
		const alt = Math.max(0, rNow - R_EARTH)
		let dt = 0.5
		if (alt < 150_000) dt = 0.2
		if (alt < 50_000) dt = 0.05
		if (alt < 10_000) dt = 0.02

		const result = stepAtmosphericEntry(currentBody, { dt, ablationCoeff: 0 }) // no ablation in prediction
		currentBody = result.body
		trajectory.push({ ...currentBody.positionM })
		timeToImpact += dt
		maxDynamicPressure = Math.max(maxDynamicPressure, result.dynamicPressurePa)

		// Check if hit ground
		const r = vecLen(currentBody.positionM)
		if (r <= R_EARTH) {
			return {
				trajectory,
				impactPoint: { ...currentBody.positionM },
				timeToImpact,
				maxDynamicPressure,
			}
		}

		// Check if escaped
		const speed = vecLen(currentBody.velocityMs)
		const escapeVel = Math.sqrt((2 * G * M_EARTH) / r)
		if (speed > escapeVel && r > R_EARTH * 2) {
			break
		}

		i++
	}

	return {
		trajectory,
		impactPoint: null,
		timeToImpact: 0,
		maxDynamicPressure,
	}
}

// Calculate seismic effects
export function calculateSeismicEffects(energyMt: number, distanceKm: number): {
	magnitude: number
	intensity: number
	arrivalTime: number
} {
	// Richter magnitude based on energy
	const magnitude = 0.67 * Math.log10(energyMt * 4.184e15) - 5.87
	
	// Modified Mercalli intensity at distance
	const intensity = Math.max(1, magnitude - 3 * Math.log10(distanceKm) + 2)
	
	// P-wave arrival time (simplified)
	const pWaveSpeed = 6000 // m/s in crust
	const arrivalTime = (distanceKm * 1000) / pWaveSpeed
	
	return {
		magnitude: Math.max(0, magnitude),
		intensity: Math.max(1, Math.min(12, intensity)),
		arrivalTime
	}
}

// Calculate atmospheric blast effects
export function calculateBlastEffects(energyMt: number, distanceKm: number): {
	overpressure: number // Pa
	arrivalTime: number // seconds
	dynamicPressure: number // Pa
	windSpeed: number // m/s
} {
	// Overpressure calculation (simplified Sedov-Taylor)
	const yieldTNT = energyMt * 1e6 // tons TNT
	const scaledDistance = distanceKm / Math.cbrt(yieldTNT) // km/kt^(1/3)
	
	let overpressure = 0
	if (scaledDistance < 10) {
		overpressure = 808 * Math.pow(scaledDistance, -1.3) + 1.9 * Math.pow(scaledDistance, -2) // kPa
		overpressure *= 1000 // convert to Pa
	}
	
	// Arrival time
	const soundSpeed = 343 // m/s
	const arrivalTime = (distanceKm * 1000) / soundSpeed
	
	// Dynamic pressure and wind speed
	const dynamicPressure = overpressure * 0.5 // rough approximation
	const windSpeed = Math.sqrt(2 * dynamicPressure / 1.225) // m/s
	
	return {
		overpressure: Math.max(0, overpressure),
		arrivalTime,
		dynamicPressure: Math.max(0, dynamicPressure),
		windSpeed: Math.max(0, windSpeed)
	}
}

// Improved crater calculation with different target materials
export function calculateCraterDiameter(energyMt: number, targetType: 'sediment' | 'hardrock' | 'water' = 'sediment'): {
	diameter: number
	depth: number
	rimHeight: number
	ejectaRange: number
} {
	const energyJ = energyMt * 4.184e15
	
	// Scaling factors for different targets
	const scalingFactors = {
		sediment: { k1: 1.8, k2: 0.13, density: 2000 },
		hardrock: { k1: 1.3, k2: 0.15, density: 2700 },
		water: { k1: 3.2, k2: 0.11, density: 1000 }
	}
	
	const factors = scalingFactors[targetType]
	const diameter = factors.k1 * Math.pow(energyJ / 4.184e15, 1/3) * 1000 // meters
	const depth = diameter * factors.k2
	const rimHeight = depth * 0.15
	const ejectaRange = diameter * 2.5
	
	return {
		diameter: Math.max(1, diameter),
		depth: Math.max(0.1, depth),
		rimHeight: Math.max(0.01, rimHeight),
		ejectaRange: Math.max(diameter, ejectaRange)
	}
}

// Определение географического местоположения по координатам
export function getLocationName(lat: number, lng: number): string {
	// Проверка на океаны
	if (lat > 66.5) return "Северный Ледовитый океан"
	if (lat < -60) return "Южный океан"
	
	// Тихий океан
	if ((lng > 120 && lng <= 180) || (lng >= -180 && lng < -80)) {
		if (lat > 0) return "северная часть Тихого океана"
		return "южная часть Тихого океана"
	}
	
	// Атлантический океан  
	if (lng >= -80 && lng <= 20) {
		if (lat > 0) return "северная часть Атлантического океана"
		return "южная часть Атлантического океана"
	}
	
	// Индийский океан
	if (lng > 20 && lng <= 120) {
		if (lat < 0) return "Индийский океан"
		if (lat < 30) return "северная часть Индийского океана"
	}
	
	// Континенты и регионы
	if (lat >= 35 && lat <= 85 && lng >= -15 && lng <= 180) {
		if (lng >= 19 && lng <= 169 && lat >= 35) {
			if (lng >= 19 && lng <= 70 && lat >= 35 && lat <= 82) return "Россия/Сибирь"
			if (lng >= 70 && lng <= 140 && lat >= 15 && lat <= 55) return "Китай/Центральная Азия"
			if (lng >= 100 && lng <= 169 && lat >= 35) return "Дальний Восток"
		}
		if (lng >= -15 && lng <= 50 && lat >= 35 && lat <= 75) return "Европа"
	}
	
	if (lat >= -60 && lat <= 35 && lng >= 10 && lng <= 55) return "Африка"
	
	if (lat >= 15 && lat <= 85 && lng >= -180 && lng <= -50) return "Северная Америка"
	if (lat >= -60 && lat <= 15 && lng >= -85 && lng <= -30) return "Южная Америка"
	
	if (lat >= -50 && lat <= 10 && lng >= 110 && lng <= 180) return "Австралия/Океания"
	
	// По умолчанию - определение по океанам
	if (Math.abs(lng) > 120) return "Тихий океан"
	if (lng > 20 && lng <= 120) return "Индийский океан"
	return "Атлантический океан"
}

// Конвертация ECEF координат в географические (широта, долгота)
// ecefToLatLng is imported from geodesy module

// Функция для точного наведения астероида на цель с компенсацией атмосферных отклонений
export function calculateAccurateTrajectory(params: {
	targetLatDeg: number
	targetLonDeg: number
	massKg: number
	diameterM: number
	entrySpeedMs: number
	entryAltitudeM: number
	angleDeg: number
	asteroidType: AsteroidType
}): {
	correctedPosition: Vector3
	correctedVelocity: Vector3
	expectedDeviation: number
} {
	// Подготовка исходных величин
	const angleRad = (params.angleDeg * Math.PI) / 180
	const vHoriz = Math.cos(angleRad) * params.entrySpeedMs
	const vDown = Math.sin(angleRad) * params.entrySpeedMs

		let targetLat = params.targetLatDeg
		let targetLng = params.targetLonDeg
	let deviationKm = 0

		// Несколько итераций для уменьшения ошибки (возьмем 5)
		const gains = [1.0, 0.7, 0.5, 0.4, 0.3]
		for (let iter = 0; iter < 5; iter++) {
			const pos = llhToECEF(targetLat, targetLng, params.entryAltitudeM)
			const frame = localFrame(targetLat, targetLng)
			// Воздухо-относительная скорость в локальной ENU
			const vAirRel = {
				x: frame.e.x * vHoriz + frame.u.x * -vDown,
				y: frame.e.y * vHoriz + frame.u.y * -vDown,
				z: frame.e.z * vHoriz + frame.u.z * -vDown,
			}
			// Добавляем к ней скорость воздуха (ω × r) для ECEF
			const omega = { x: 0, y: 0, z: OMEGA_EARTH } as Vector3
			const airVel = {
				x: omega.y * pos.z - omega.z * pos.y,
				y: omega.z * pos.x - omega.x * pos.z,
				z: omega.x * pos.y - omega.y * pos.x,
			}
			const vel = vecAdd(vAirRel, airVel)

		const testBody: Body = {
			positionM: pos,
			velocityMs: vel,
			massKg: params.massKg,
			diameterM: params.diameterM,
			asteroidType: params.asteroidType
		}
			const prediction = predictTrajectory(testBody)
		if (!prediction.impactPoint) {
			break
		}

		const impact = ecefToLatLng(prediction.impactPoint)
		const latError = params.targetLatDeg - impact.lat
		const lngError = params.targetLonDeg - impact.lng
		deviationKm = Math.sqrt(latError * latError + lngError * lngError) * 111

			// Корректируем цель с демпфированием
			const k = gains[Math.min(iter, gains.length - 1)]
			targetLat = targetLat + latError * k
			targetLng = targetLng + lngError * k

			// Конвергенция достигнута
			if (deviationKm < 1.0) break
	}

	const correctedPos = llhToECEF(targetLat, targetLng, params.entryAltitudeM)
	const correctedFrame = localFrame(targetLat, targetLng)
		const vAirRelFinal = {
			x: correctedFrame.e.x * vHoriz + correctedFrame.u.x * -vDown,
			y: correctedFrame.e.y * vHoriz + correctedFrame.u.y * -vDown,
			z: correctedFrame.e.z * vHoriz + correctedFrame.u.z * -vDown,
		}
		const omegaF = { x: 0, y: 0, z: OMEGA_EARTH } as Vector3
		const airVelF = {
			x: omegaF.y * correctedPos.z - omegaF.z * correctedPos.y,
			y: omegaF.z * correctedPos.x - omegaF.x * correctedPos.z,
			z: omegaF.x * correctedPos.y - omegaF.y * correctedPos.x,
		}
		const correctedVel = vecAdd(vAirRelFinal, airVelF)

	return {
		correctedPosition: correctedPos,
		correctedVelocity: correctedVel,
		expectedDeviation: deviationKm
	}
}
