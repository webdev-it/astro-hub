import { useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

type Props = ThreeElements['mesh'] & {
  sunDirRef?: React.MutableRefObject<THREE.Vector3 | null>
}

// Single-scattering approximation (cheap Rayleigh + Mie), view-dependent
export default function Atmosphere({ sunDirRef, ...props }: Props) {
  const material = useMemo(() => {
    const uniforms = {
      sunDir: { value: new THREE.Vector3(1, 0.3, 0.8).normalize() },
      rayleigh: { value: 3.0 },
      mie: { value: 0.005 },
      g: { value: 0.76 }, // Mie anisotropy
      colorRayleigh: { value: new THREE.Color(0x6cbcff) },
      colorMie: { value: new THREE.Color(0x86b9ff) },
      intensity: { value: 0.7 },
    }
    const vertexShader = /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      void main(){
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `
    const fragmentShader = /* glsl */ `
      uniform vec3 sunDir;
      uniform float rayleigh;
      uniform float mie;
      uniform float g; // anisotropy
      uniform vec3 colorRayleigh;
      uniform vec3 colorMie;
      uniform float intensity;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      
      // Simple Schlick phase for Rayleigh-like, and Henyey–Greenstein for Mie
      float phaseRayleigh(float cosTheta) {
        return 3.0/(16.0*3.14159265) * (1.0 + cosTheta*cosTheta);
      }
      float phaseMie(float cosTheta, float g) {
        float g2 = g*g;
        float denom = pow(1.0 + g2 - 2.0*g*cosTheta, 1.5);
        return 1.0/(4.0*3.14159265) * (1.0 - g2) / denom;
      }
      
      void main(){
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 N = normalize(vNormal);
        float cosTheta = dot(N, sunDir);
        float mu = dot(V, sunDir);
        
        // Atmospheric density falloff (very approximate by view angle)
        float viewHorizon = clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0);
        float density = mix(0.2, 1.0, pow(viewHorizon, 0.6));
        
        float pr = phaseRayleigh(cosTheta);
        float pm = phaseMie(mu, g);
        vec3 scatter = colorRayleigh * rayleigh * pr + colorMie * mie * pm;
        vec3 col = scatter * density * intensity;
        gl_FragColor = vec4(col, clamp(length(col), 0.0, 0.85));
      }
    `
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    return mat
  }, [])

  // Update sunDir from ref if provided
  if (sunDirRef?.current) {
    ;(material as any).uniforms.sunDir.value.copy(sunDirRef.current).normalize()
  }

  return (
    <mesh {...props}>
      <sphereGeometry args={[1.035, 96, 96]} />
      <primitive object={material} attachObject={["material", undefined]} />
    </mesh>
  )
}
