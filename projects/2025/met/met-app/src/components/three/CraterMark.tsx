import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  position: [number, number, number] // surface point (scene units)
  finalRadius?: number // scene units (Earth radius = 1)
  growTime?: number // seconds to reach full size
  opacity?: number // base opacity
}

export default function CraterMark({ position, finalRadius = 0.05, growTime = 2, opacity = 0.6 }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [time, setTime] = useState(0)
  const normal = useMemo(() => new THREE.Vector3(...position).normalize(), [position])
  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
    [normal]
  )
  const pos = useMemo(() => normal.clone().multiplyScalar(1.001), [normal]) // slight offset
  const geom = useMemo(() => new THREE.CircleGeometry(1, 48), [])

  // Generate small radial gradient texture once (dark center, softer edge)
  const texture = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
    g.addColorStop(0, 'rgba(30,30,30,1)')
    g.addColorStop(0.6, 'rgba(30,30,30,0.9)')
    g.addColorStop(1, 'rgba(30,30,30,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    tex.needsUpdate = true
    return tex
  }, [])

  useFrame((_, dt) => setTime((t) => t + dt))

  const k = Math.min(1, time / growTime)
  const ease = (x: number) => 1 - Math.pow(1 - x, 3) // easeOutCubic
  const scale = finalRadius * ease(k)
  const o = opacity * (0.9 + 0.1 * (1 - k))

  return (
    <group>
      {/* Inner dark bowl */}
      <mesh ref={meshRef} position={pos} quaternion={quat} scale={[scale, scale, scale]}>
        <primitive object={geom} attach="geometry" />
        <meshBasicMaterial map={texture} transparent opacity={o} depthWrite={false} />
      </mesh>
      {/* Elevated rim ring */}
      <mesh position={pos} quaternion={quat} scale={[scale * 1.06, scale * 1.06, scale * 1.06]}>
        <ringGeometry args={[0.88, 1.0, 64]} />
        <meshBasicMaterial color="#3a2f25" transparent opacity={o * 0.8} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Faint ejecta blanket */}
      <mesh position={pos} quaternion={quat} scale={[scale * 1.6, scale * 1.6, scale * 1.6]}>
        <ringGeometry args={[1.0, 1.6, 64]} />
        <meshBasicMaterial color="#7a6a55" transparent opacity={o * 0.18} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Central peak (large craters) */}
      {finalRadius > 0.08 && (
        <mesh position={pos} quaternion={quat} scale={[scale * 0.12, scale * 0.12, scale * 0.12]}>
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color="#2b2621" transparent opacity={o * 0.7} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
