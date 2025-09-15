import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

export default function Clouds(props: ThreeElements['mesh']) {
  const mesh = useRef<THREE.Mesh>(null)
  const mesh2 = useRef<THREE.Mesh>(null)
  const [alphaMap, setAlphaMap] = useState<THREE.Texture | null>(null)

  // Try a set of URLs in order (hi-res → fallback)
  useEffect(() => {
    const urls = [
      'https://www.solarsystemscope.com/textures/download/8k_earth_clouds.png',
      'https://www.solarsystemscope.com/textures/download/4k_earth_clouds.png',
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r180/examples/textures/planets/earth_clouds_1024.png',
      'https://unpkg.com/three@0.180.0/examples/textures/planets/earth_clouds_1024.png',
    ]

    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')

    const tryNext = (index: number) => {
      if (cancelled || index >= urls.length) return
  const url = urls[index]
      loader.load(
        url,
        (tex) => {
          if (cancelled) return
          tex.generateMipmaps = true
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.magFilter = THREE.LinearFilter
          tex.anisotropy = 16
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
          setAlphaMap(tex)
        },
        undefined,
        () => tryNext(index + 1)
      )
    }
    tryNext(0)
    return () => {
      cancelled = true
    }
  }, [])
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.01
    if (mesh2.current) mesh2.current.rotation.y += delta * 0.0125
  })
  return (
    <mesh ref={mesh} {...props}>
      <sphereGeometry args={[1.002, 64, 64]} />
      {alphaMap ? (
        // Make clouds extremely subtle
        <meshStandardMaterial transparent alphaMap={alphaMap} color="#ffffff" opacity={0.08} depthWrite={false} />
      ) : (
        <meshStandardMaterial transparent color="#ffffff" opacity={0.12} depthWrite={false} />
      )}
      {/* subtle second layer for parallax */}
      <mesh ref={mesh2} scale={[1.004, 1.004, 1.004] as any}>
        <sphereGeometry args={[1.0, 64, 64]} />
        {alphaMap ? (
          <meshStandardMaterial transparent alphaMap={alphaMap} color="#ffffff" opacity={0.03} depthWrite={false} />
        ) : (
          <meshStandardMaterial transparent color="#ffffff" opacity={0.06} depthWrite={false} />
        )}
      </mesh>
    </mesh>
  )
}
