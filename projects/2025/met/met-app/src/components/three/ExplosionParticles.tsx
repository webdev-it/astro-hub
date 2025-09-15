import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  position: [number, number, number]
  count?: number
  power?: number // scales initial speeds
  duration?: number
}

export default function ExplosionParticles({ position, count = 200, power = 1, duration = 2 }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const [time, setTime] = useState(0)
  const { velocities, colors } = useMemo(() => {
    const velocities: THREE.Vector3[] = []
    const colors: THREE.Color[] = []
    const color1 = new THREE.Color('#ffaa00')
    const color2 = new THREE.Color('#ff3300')
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3().randomDirection()
      const speed = (Math.random() ** 0.5) * 30 * power
      velocities.push(dir.multiplyScalar(speed))
      colors.push(color1.clone().lerp(color2, Math.random()))
    }
    return { velocities, colors }
  }, [count, power])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, dt) => {
    setTime((t) => t + dt)
    const t = Math.min(time + dt, duration)
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      const v = velocities[i]
      const fade = 1 - t / duration
      const p = new THREE.Vector3(position[0], position[1], position[2]).add(v.clone().multiplyScalar(t))
      dummy.position.copy(p)
      const s = Math.max(0.002, 0.02 * fade)
      dummy.scale.setScalar(s)
      dummy.rotation.set(Math.random(), Math.random(), Math.random())
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      const col = colors[i].clone().multiplyScalar(0.8 + 0.2 * fade)
      meshRef.current.setColorAt?.(i, col)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    ;(meshRef.current as any).instanceColor && ((meshRef.current as any).instanceColor.needsUpdate = true)
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, count]} frustumCulled={false}
      onUpdate={(mesh) => { mesh.layers.enable(1) }}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  )
}
