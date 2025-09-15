import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  position: [number, number, number]
  duration?: number // seconds
  maxRadius?: number // in scene units (Earth radius = 1)
  color?: string
}

export default function Shockwave({ position, duration = 1.5, maxRadius = 0.25, color = '#ffffff' }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [time, setTime] = useState(0)
  const normal = useMemo(() => new THREE.Vector3(...position).normalize(), [position])
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal), [normal])
  const pos = useMemo(() => normal.clone().multiplyScalar(1.002), [normal]) // slight offset above surface

  // Thin unit ring, scaled up in time
  const geom = useMemo(() => new THREE.RingGeometry(1.0, 1.03, 64, 1), [])

  useFrame((_, dt) => setTime((t) => t + dt))

  const t = Math.min(time, duration)
  const k = t / duration
  const ease = (x: number) => 1 - (1 - x) * (1 - x) // easeOutQuad
  const radius = maxRadius * ease(k)
  const opacity = 0.8 * (1 - k)

  if (opacity <= 0) return null

  return (
    <mesh ref={meshRef} position={pos} quaternion={quat} scale={[radius, radius, radius]}
      onUpdate={(m) => { m.layers.enable(1) }}
    >
      <primitive object={geom} attach="geometry" />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}
