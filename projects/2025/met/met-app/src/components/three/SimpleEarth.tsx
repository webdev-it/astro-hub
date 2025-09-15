// no R3F hooks used here
import type { ThreeElements } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'

// Use only basic Earth texture for performance
const SIMPLE_EARTH = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'

type Props = ThreeElements['mesh'] & {
	uvOffsetDeg?: number
}

export const SimpleEarth = forwardRef<THREE.Mesh, Props>(function SimpleEarth(
	{ children, uvOffsetDeg = 0, ...props },
	ref
) {
	const mesh = useRef<THREE.Mesh>(null)

	useImperativeHandle(ref, () => mesh.current as THREE.Mesh, [])

	// Load only one texture for performance
	const colorMap = useTexture(SIMPLE_EARTH)

	// Simple texture setup
	if (colorMap) {
		colorMap.generateMipmaps = true
		colorMap.minFilter = THREE.LinearMipmapLinearFilter
		colorMap.magFilter = THREE.LinearFilter
			colorMap.wrapS = THREE.RepeatWrapping
			colorMap.wrapT = THREE.ClampToEdgeWrapping
			// Apply horizontal UV offset for longitude alignment
			const offsetU = ((uvOffsetDeg / 360) % 1 + 1) % 1
			colorMap.offset.set(offsetU, 0)
	}

	// Keep Earth static in ECEF-aligned world frame (rotation handled via sun direction)

	return (
		<mesh ref={mesh} {...props}>
			<sphereGeometry args={[1, 32, 32]} />
			<meshLambertMaterial map={colorMap} transparent={false} />
			{children}
		</mesh>
	)
})

// Export both for compatibility
export default SimpleEarth
export { SimpleEarth as Earth }