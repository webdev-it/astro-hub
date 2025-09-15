import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TrajectoryTrailProps {
  positions: THREE.Vector3[]
  maxLength?: number
  color?: string
}

export default function TrajectoryTrail({ positions, maxLength = 20, color = '#ff6600' }: TrajectoryTrailProps) {
  // Simplified trail - just render last few positions as spheres for performance
  const recentPositions = positions.slice(-Math.min(maxLength, 10))
  
  if (recentPositions.length < 2) return null

  return (
    <group>
      {recentPositions.map((pos, i) => {
        const alpha = i / (recentPositions.length - 1)
        const scale = 0.01 + alpha * 0.02
        return (
          <mesh key={i} position={pos.toArray()}>
            <sphereGeometry args={[scale, 8, 8]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={alpha * 0.6}
            />
          </mesh>
        )
      })}
    </group>
  )
}

interface ImpactPredictionProps {
  impactPoint: THREE.Vector3 | null
  trajectoryPoints: THREE.Vector3[]
}

export function ImpactPrediction({ impactPoint, trajectoryPoints }: ImpactPredictionProps) {
  const markerRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    if (markerRef.current) {
      // Pulse effect for impact marker
      const scale = 1 + 0.2 * Math.sin(time.current * 2) // Slower pulse
      markerRef.current.scale.setScalar(scale)
    }
  })

  if (!impactPoint) return null

  return (
    <group>
      {/* Impact point marker */}
      <mesh ref={markerRef} position={impactPoint.toArray()}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial 
          color="#ff0000" 
          transparent 
          opacity={0.8}
        />
      </mesh>
      
      {/* Trajectory trail - simplified */}
      <TrajectoryTrail positions={trajectoryPoints} maxLength={15} color="#ffaa00" />
      
      {/* Simple impact zone circle */}
      <mesh position={impactPoint.toArray()} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.06, 16]} />
        <meshBasicMaterial 
          color="#ff3300" 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}