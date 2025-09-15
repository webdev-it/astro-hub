import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { forwardRef, useEffect, useMemo, useRef, useImperativeHandle } from 'react'
import * as THREE from 'three'

// Use stable remote textures from threejs.org examples (NASA-based, CORS-enabled)
const ALBEDO = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
const NIGHT = 'https://threejs.org/examples/textures/planets/earth_lights_2048.png'
const NORMAL = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'
const SPEC = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'
const CLOUDS_ALPHA = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png'

type Props = ThreeElements['mesh'] & {
	sunDir?: [number, number, number]
	sunDirRef?: React.MutableRefObject<THREE.Vector3 | null>
  uvOffsetDeg?: number
}

export const Earth = forwardRef<THREE.Mesh, Props>(function Earth(
	{ sunDir = [0.7, 0.5, 0.7], sunDirRef, uvOffsetDeg = 0, children, ...props },
	ref
) {
	const mesh = useRef<THREE.Mesh>(null)
	// Expose mesh ref to parent (for worldToLocal, parenting effects, etc.)
	useImperativeHandle(ref, () => mesh.current as THREE.Mesh, [])
	// These hooks suspend until textures are loaded; keep the component inside a <Suspense>.
	const colorMap = useTexture(ALBEDO)
	const nightMap = useTexture(NIGHT)
	const normalMap = useTexture(NORMAL)
	const specMap = useTexture(SPEC)
	const cloudsMap = useTexture(CLOUDS_ALPHA)
	// Improve sampling quality
	;[colorMap, normalMap, nightMap, specMap, cloudsMap].forEach((t) => {
		if (!t) return
		t.generateMipmaps = true
		t.minFilter = THREE.LinearMipmapLinearFilter
		t.magFilter = THREE.LinearFilter
		t.anisotropy = 8
		t.wrapS = THREE.RepeatWrapping
		t.wrapT = THREE.ClampToEdgeWrapping
	})

	const material = useMemo(() => {
		const uniforms = {
			dayMap: { value: colorMap },
			nightMap: { value: nightMap },
			specMap: { value: specMap },
			normalMap: { value: normalMap },
			normalStrength: { value: 0.35 },
			cloudsMap: { value: cloudsMap },
			cloudShadowStrength: { value: 0.35 },
			cloudUvShift: { value: 0.01 },
			sunDir: { value: new THREE.Vector3().fromArray(sunDir).normalize() },
			terminatorSoftness: { value: 0.28 },
			nightBoost: { value: 1.35 },
			shininess: { value: 40.0 },
			rimColor: { value: new THREE.Color(0x4ea7ff) },
			rimPower: { value: 2.0 },
			time: { value: 0.0 },
		}
		const vertexShader = /* glsl */`
			varying vec2 vUv;
			varying vec3 vNormalW;
			varying vec3 vWorldPos;
			void main(){
				vUv = uv;
				vec4 wp = modelMatrix * vec4(position, 1.0);
				vWorldPos = wp.xyz;
				vNormalW = normalize(normalMatrix * normal);
				gl_Position = projectionMatrix * viewMatrix * wp;
			}
		`
		const fragmentShader = /* glsl */`
			uniform sampler2D dayMap;
			uniform sampler2D nightMap;
			uniform sampler2D specMap;
			uniform sampler2D normalMap;
			uniform float normalStrength;
			uniform sampler2D cloudsMap;
			uniform float cloudShadowStrength;
			uniform float cloudUvShift;
			uniform vec3 sunDir; // world-space normalized direction from surface to sun
			uniform float terminatorSoftness; // wider = softer edge
			uniform float nightBoost;
			uniform float shininess;
			uniform vec3 rimColor;
			uniform float rimPower;
			uniform float time;
			uniform float uvOffset; // 0..1 horizontal offset
			varying vec2 vUv;
			varying vec3 vNormalW;
			varying vec3 vWorldPos;
            
			// Hash for twinkle
			float hash12(vec2 p) {
			  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
			  p3 += dot(p3, p3.yzx + 33.33);
			  return fract((p3.x + p3.y) * p3.z);
			}

			// Build an approximate TBN from the normal and a fallback up vector
			mat3 approximateTBN(vec3 N) {
			  vec3 up = abs(N.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
			  vec3 T = normalize(cross(up, N));
			  vec3 B = cross(N, T);
			  return mat3(T, B, N);
			}

			void main(){
				// Simple Lambert term
				vec3 N = normalize(vNormalW);
				// Normal mapping (micro lighting cues)
				vec2 uvShifted = vec2(fract(vUv.x + uvOffset), vUv.y);
				vec3 nTex = texture2D(normalMap, uvShifted).xyz * 2.0 - 1.0;
				mat3 TBN = approximateTBN(N);
				vec3 Nmap = normalize(TBN * nTex);
				N = normalize(mix(N, Nmap, clamp(normalStrength, 0.0, 1.0)));
				vec3 L = normalize(sunDir);
				vec3 V = normalize(cameraPosition - vWorldPos);
				float ndl = max(0.0, dot(N, L));
				// Smooth terminator using softness width
				float nightFactor = smoothstep(0.0, clamp(terminatorSoftness, 0.001, 1.0), 1.0 - ndl);
				vec3 dayColor = texture2D(dayMap, uvShifted).rgb;
				vec3 nightColor = texture2D(nightMap, uvShifted).rgb * nightBoost;

				// Twinkle for city lights
				float tw = 0.9 + 0.2 * sin( (hash12(vUv * 512.0) * 10.0) + time * 2.0 );
				nightColor *= tw;

				// Specular (ocean) using spec mask
				float specMask = texture2D(specMap, uvShifted).r; // grayscale (oceans bright)
				float ocean = smoothstep(0.2, 0.9, specMask);
				vec3 H = normalize(L + V);
				float spec = pow(max(dot(N, H), 0.0), shininess) * ocean * (1.0 - nightFactor);

				// Approx cloud shadows on day side using clouds alpha with dynamic parallax
				vec2 shiftDir = normalize(vec2(L.z, -L.x));
				// Latitude factor: more parallax near equator, less near poles
				float lat = asin(clamp(N.y, -1.0, 1.0));
				float latFactor = 0.3 + 0.7 * cos(abs(lat));
				float hSample = texture2D(cloudsMap, vUv).a; // use alpha as pseudo height
				float heightFactor = 0.5 + 1.5 * pow(hSample, 1.5);
				vec2 uvShift = shiftDir * cloudUvShift * latFactor * (0.4 + 0.6 * ndl) * heightFactor;
				float cloudA = texture2D(cloudsMap, vUv + uvShift).a; // PNG alpha
				float shadow = cloudA * cloudShadowStrength * step(0.0, ndl);

				// Rim tint for more blue near the limb
				float rim = pow(1.0 - max(dot(N, V), 0.0), rimPower);

				// Base lit day color + specular
				vec3 litDay = dayColor * (0.25 + 0.85 * ndl) + spec * 0.6;
				litDay *= (1.0 - shadow * 0.8);
				spec *= (1.0 - shadow * 0.5);
				vec3 color = mix(litDay, nightColor, nightFactor);
				color += rim * rimColor * 0.12;
				color = clamp(color, 0.0, 1.0);
				gl_FragColor = vec4(color, 1.0);
			}
		`
		const mat = new THREE.ShaderMaterial({
			uniforms,
			vertexShader,
			fragmentShader,
		})
		return mat
	}, [colorMap, nightMap, specMap, sunDir])

	// Attempt to hot-swap to higher-res local textures if present under /public/textures/earth
	useEffect(() => {
		const u = (material as any)?.uniforms
		if (!u) return
		// Set uv offset from props
		u.uvOffset = u.uvOffset || { value: 0 }
		u.uvOffset.value = ((uvOffsetDeg / 360) % 1 + 1) % 1
		const loader = new THREE.TextureLoader()
		loader.setCrossOrigin('anonymous')
		const setup = (t: THREE.Texture) => {
			t.generateMipmaps = true
			t.minFilter = THREE.LinearMipmapLinearFilter
			t.magFilter = THREE.LinearFilter
			t.anisotropy = 8
			t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
		}
		const tryLoad = (path: string, apply: (tex: THREE.Texture) => void) => {
			loader.load(
				path,
				(tex) => { setup(tex); apply(tex); },
				undefined,
				() => { /* ignore */ }
			)
		}
		tryLoad('/textures/earth/day_8k.jpg', (tex) => { u.dayMap.value = tex })
		tryLoad('/textures/earth/night_8k.jpg', (tex) => { u.nightMap.value = tex })
		tryLoad('/textures/earth/normal_4k.jpg', (tex) => { u.normalMap.value = tex })
		tryLoad('/textures/earth/spec_4k.jpg', (tex) => { u.specMap.value = tex })
		tryLoad('/textures/earth/clouds_alpha_4k.png', (tex) => { u.cloudsMap.value = tex })
	}, [material])

	useFrame((_, delta) => {
		// Keep mesh orientation fixed to align with ECEF frame; don't spin the geometry
		const u = (material as any)?.uniforms
		if (u?.sunDir?.value) {
			if (sunDirRef?.current) {
				u.sunDir.value.copy(sunDirRef.current).normalize()
			} else {
				u.sunDir.value.fromArray(sunDir).normalize()
			}
		}
		if (u?.time) u.time.value += delta
	})
	return (
		<mesh {...props} ref={mesh} castShadow receiveShadow>
			<sphereGeometry args={[1, 64, 64]} />
			<primitive object={material} attachObject={["material", undefined]} />
			{children}
		</mesh>
	)
})

export default Earth
