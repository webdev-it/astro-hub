import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { useScenarioStore } from '../../store/useScenarioStore'

type Props = ThreeElements['mesh'] & {
	diameterM: number
	meterScale?: number // meters per scene unit
}

// Map asteroid type to typical geometric albedo (pV)
function defaultAlbedo(type?: string): number {
	switch (type) {
		case 'rocky': return 0.22 // S-type
		case 'iron': return 0.10 // M-type average
		case 'icy': return 0.04 // comet-like dark surface
		case 'carbon': return 0.05 // C-type
		default: return 0.12
	}
}

// Estimate albedo from NASA H and D: D(km) = 1329/sqrt(pV) * 10^{-H/5}
// => pV = (1329/D)^2 * 10^{-0.4H}
function estimateAlbedoFromH(H?: number, diameterM?: number, fallback: number = 0.12): number {
	if (!H || !isFinite(H) || !diameterM || diameterM <= 0) return fallback
	const Dkm = diameterM / 1000
	const pV = Math.pow(1329 / Dkm, 2) * Math.pow(10, -0.4 * H)
	// Clamp to sensible asteroid range
	return Math.min(0.6, Math.max(0.02, pV))
}

export default function Asteroid({ diameterM, meterScale = 6_371_000, ...rest }: Props) {
	const meshRef = useRef<THREE.Mesh>(null)
	const groupRef = useRef<THREE.Group>(null)
	const { selectedNEOId, neos, params, simState, lastCrater } = useScenarioStore()
	const selectedNEO = useMemo(() => neos.find(n => n.id === selectedNEOId), [neos, selectedNEOId])

	const radiusScene = Math.max((diameterM / 2) / meterScale, 0.0005)

	// Determine visual albedo
	const baseAlbedo = estimateAlbedoFromH(selectedNEO?.absolute_magnitude_h, diameterM, defaultAlbedo(params.asteroidType))

	// Map albedo/type to base color (sRGB)
	const baseColor = useMemo(() => {
		// Slight hue bias by type
		let hue = 25 / 360 // warm rocky
		if (params.asteroidType === 'carbon') hue = 30 / 360
		if (params.asteroidType === 'iron') hue = 18 / 360
		if (params.asteroidType === 'icy') hue = 0
		// Brightness from albedo (very dark -> 0.12, bright -> 0.5)
		const v = 0.12 + 0.9 * Math.sqrt(Math.max(0, Math.min(1, baseAlbedo / 0.3))) // compress
		const s = 0.25
		// HSV to RGB
		const i = Math.floor(hue * 6)
		const f = hue * 6 - i
		const p = v * (1 - s)
		const q = v * (1 - f * s)
		const t = v * (1 - (1 - f) * s)
		let r=0,g=0,b=0
		switch (i % 6) { case 0: r=v; g=t; b=p; break; case 1: r=q; g=v; b=p; break; case 2: r=p; g=v; b=t; break; case 3: r=p; g=q; b=v; break; case 4: r=t; g=p; b=v; break; case 5: r=v; g=p; b=q; break }
		return new THREE.Color(r, g, b)
	}, [baseAlbedo, params.asteroidType])

	// Geometry: icosahedron subdivided, displaced on GPU via shader (keeps normals consistent under lighting)
	const geom = useMemo(() => new THREE.IcosahedronGeometry(radiusScene, 4), [radiusScene])

	const mat = useMemo(() => {
		const m = new THREE.MeshStandardMaterial({
			color: baseColor,
			roughness: 0.92,
			metalness: 0.02,
		})
		m.onBeforeCompile = (shader) => {
			shader.uniforms.uNoiseAmp = { value: Math.max(0.02, 0.25 * radiusScene) } // scene units
			shader.uniforms.uSeed = { value: new THREE.Vector3(Math.random()*100, Math.random()*100, Math.random()*100) }
			shader.uniforms.uTime = { value: 0 }
			shader.vertexShader = `
				uniform float uNoiseAmp; uniform vec3 uSeed; uniform float uTime;
				// 3D simplex noise (small, inlined)
				vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
				vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
				vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} 
				vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
				float snoise(vec3 v){
					const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
					const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
					vec3 i  = floor(v + dot(v, C.yyy) );
					vec3 x0 =   v - i + dot(i, C.xxx) ;
					vec3 g = step(x0.yzx, x0.xyz);
					vec3 l = 1.0 - g;
					vec3 i1 = min( g.xyz, l.zxy );
					vec3 i2 = max( g.xyz, l.zxy );
					vec3 x1 = x0 - i1 + 1.0 * C.xxx;
					vec3 x2 = x0 - i2 + 2.0 * C.xxx;
					vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
					i = mod289(i);
					vec4 p = permute( permute( permute(
										i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
									+ i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
									+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
					float n_ = 0.142857142857; // 1/7
					vec3  ns = n_ * D.wyz - D.xzx;
					vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
					vec4 x_ = floor(j * ns.z);
					vec4 y_ = floor(j - 7.0 * x_ );
					vec4 x = x_ *ns.x + ns.yyyy;
					vec4 y = y_ *ns.x + ns.yyyy;
					vec4 h = 1.0 - abs(x) - abs(y);
					vec4 b0 = vec4( x.xy, y.xy );
					vec4 b1 = vec4( x.zw, y.zw );
					vec4 s0 = floor(b0)*2.0 + 1.0;
					vec4 s1 = floor(b1)*2.0 + 1.0;
					vec4 sh = -step(h, vec4(0.0));
					vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
					vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
					vec3 p0 = vec3(a0.xy,h.x);
					vec3 p1 = vec3(a1.xy,h.y);
					vec3 p2 = vec3(a0.zw,h.z);
					vec3 p3 = vec3(a1.zw,h.w);
					vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
					p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
					vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
					m = m * m;
					return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
				}
			` + shader.vertexShader.replace(
				'#include <begin_vertex>',
				`#include <begin_vertex>
				 // Fractal noise for lumpy silhouette
				 float n1 = snoise(normal + uSeed + position*2.0);
				 float n2 = snoise((normal*0.7 + position*1.5) + uSeed*0.5);
				 float n = (n1*0.6 + n2*0.4);
				 transformed += normal * (uNoiseAmp * n);
				`
			)
			// animate time uniform for potential future use
			;(m as any)._shaderRef = shader
		}
		return m
	}, [baseColor, radiusScene])

	// Tumbling rotation (two-axis) and post-impact sinking
	const sinkTRef = useRef(0)
	const sinkTargetRef = useRef(0)
	useFrame((_, dt) => {
		if (!meshRef.current) return
		// Stop rotation once not running (impact/complete)
		if (simState === 'running') {
			const spinBase = THREE.MathUtils.clamp(0.2 / Math.sqrt(Math.max(10, diameterM)), 0.001, 0.03)
			meshRef.current.rotation.y += spinBase * 60 * dt
			meshRef.current.rotation.x += spinBase * 33 * dt
			// reset sinking during flight
			sinkTRef.current = 0
			meshRef.current.position.set(0,0,0)
		} else {
			// compute sink target from crater depth (scene units), limited by asteroid size
			const depthScene = lastCrater ? (lastCrater.depthM / meterScale) : 0
			const maxSink = radiusScene * 0.8
			sinkTargetRef.current = Math.min(maxSink, Math.max(0, depthScene))
			if (sinkTRef.current < 1 && sinkTargetRef.current > 0) {
				sinkTRef.current = Math.min(1, sinkTRef.current + dt / 0.7)
			}
		}
		const anyMat = meshRef.current.material as any
		const sh = anyMat?._shaderRef
		if (sh) sh.uniforms.uTime.value += dt

		// Apply sinking offset along inward normal from Earth's surface point
		if (groupRef.current) {
			const base = groupRef.current.position
			const normal = base.lengthSq() > 0 ? base.clone().normalize() : new THREE.Vector3(0,1,0)
			const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
			const sink = sinkTargetRef.current * easeOut(sinkTRef.current)
			const offset = normal.clone().multiplyScalar(-sink)
			meshRef.current.position.copy(offset)
		}
	})

	// Ensure asteroid does not bloom by default (kept on base layer 0)
	useEffect(() => {
		if (meshRef.current) {
			meshRef.current.layers.enable(0)
			meshRef.current.layers.disable(1)
		}
	}, [])

	// Apply outer position/rotation/scale to a group; animate local offset on mesh
	return (
		<group ref={groupRef} {...(rest as any)}>
			<mesh ref={meshRef} geometry={geom} material={mat} castShadow receiveShadow />
		</group>
	)
}
