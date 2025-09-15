import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  position: [number, number, number]
  duration?: number
  maxSize?: number
}

export default function DustBillboard({ position, duration = 2.5, maxSize = 0.25 }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [time, setTime] = useState(0)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(180,160,140,0.35)')
    g.addColorStop(1, 'rgba(180,160,140,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    return t
  }, [])

  useFrame((_, dt) => setTime((t) => t + dt))
  const k = Math.min(1, time / duration)
  const scale = maxSize * (0.6 + 0.4 * k)
  const opacity = 0.6 * (1 - k)
  if (opacity <= 0) return null

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}
