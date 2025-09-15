import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

type Props = {
  intensity?: number
  threshold?: number
  radius?: number
  selective?: boolean
  cinematic?: boolean
  exposure?: number
}

const BLOOM_LAYER_IDX = 1

export default function PostFX({ intensity = 0.55, threshold = 0.85, radius = 0.2, selective = false, cinematic = false, exposure = 1.0 }: Props) {
  const { gl, scene, camera, size } = useThree()

  // Shared helpers for selective bloom
  const bloomLayer = useMemo(() => {
    const l = new THREE.Layers()
    l.set(BLOOM_LAYER_IDX)
    return l
  }, [])
  const darkMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 'black' }), [])
  const materials = useMemo(() => new Map<THREE.Object3D, THREE.Material | THREE.Material[]>(), [])

  // Composer when selective bloom is OFF (simple global bloom)
  const globalComposer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 2 })
    const composer = new EffectComposer(gl, target)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), intensity, radius, threshold))
    composer.setSize(size.width, size.height)
    return composer
  }, [gl, scene, camera])

  // Composers for selective bloom
  const bloomComposer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 2 })
    const composer = new EffectComposer(gl, target)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), intensity, radius, threshold))
    composer.setSize(size.width, size.height)
    return composer
  }, [gl, scene, camera])

  const finalComposer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 2 })
    const composer = new EffectComposer(gl, target)
    composer.addPass(new RenderPass(scene, camera))
    // Simple additive combine shader: out = base + bloom
    const additiveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        varying vec2 vUv;
        void main() {
          vec4 base = texture2D(tDiffuse, vUv);
          vec4 bloom = texture2D(tBloom, vUv);
          gl_FragColor = base + bloom; // additive
        }
      `,
      depthWrite: false,
      depthTest: false,
      transparent: false,
    })
    const mixPass = new ShaderPass(additiveMaterial, 'tDiffuse')
    composer.addPass(mixPass)
    // Optional vignette in cinematic mode
    const vignetteMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        strength: { value: 0.35 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float strength;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv - 0.5;
          float r = length(uv);
          float vign = smoothstep(0.8, 0.2, r) * strength; // darker at edges
          vec4 col = texture2D(tDiffuse, vUv);
          col.rgb *= 1.0 - vign;
          gl_FragColor = col;
        }
      `,
      depthWrite: false,
      depthTest: false,
      transparent: false,
    })
    const vignettePass = new ShaderPass(vignetteMaterial, 'tDiffuse')
    // We'll toggle this pass in a useEffect based on cinematic
    ;(vignettePass as any).__isVignette = true
    composer.addPass(vignettePass)
    composer.setSize(size.width, size.height)
    return composer
  }, [gl, scene, camera])

  // Resize handling
  useEffect(() => {
    globalComposer.setSize(size.width, size.height)
    bloomComposer.setSize(size.width, size.height)
    finalComposer.setSize(size.width, size.height)
  }, [globalComposer, bloomComposer, finalComposer, size])

  // Update bloom params if props change
  useEffect(() => {
    const updateBloom = (composer: EffectComposer) => {
      const bloom = composer.passes.find((p) => (p as any).strength !== undefined) as UnrealBloomPass | undefined
      if (bloom) {
        bloom.strength = intensity
        bloom.radius = radius
        bloom.threshold = threshold
      }
    }
    updateBloom(globalComposer)
    updateBloom(bloomComposer)
  }, [globalComposer, bloomComposer, intensity, radius, threshold])

  // Cinematic tone mapping toggle
  useEffect(() => {
    gl.toneMapping = cinematic ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping
    gl.toneMappingExposure = exposure
    // Enable/disable vignette pass in final composer
    const vignette = finalComposer.passes.find((p: any) => p.__isVignette)
    if (vignette) vignette.enabled = !!cinematic
  }, [gl, cinematic, exposure])

  const restoreMaterial = (obj: THREE.Object3D) => {
    const mat = materials.get(obj)
    if (mat) {
      // @ts-ignore
      ;(obj as any).material = mat
      materials.delete(obj)
    }
  }

  const darkenNonBloomed = (obj: THREE.Object3D) => {
    if ((obj as any).isMesh) {
      const mesh = obj as unknown as THREE.Mesh
      if (!bloomLayer.test(mesh.layers)) {
        materials.set(mesh, mesh.material as any)
        mesh.material = darkMaterial
      }
    }
  }

  useFrame((_, delta) => {
    if (!selective) {
      globalComposer.render(delta)
      return
    }

    // 1) Render bloom-only scene by replacing non-bloom materials with black
    scene.traverse(darkenNonBloomed)
    bloomComposer.render(delta)
    scene.traverse(restoreMaterial)

    // 2) Feed bloom texture into final composer and render full scene + bloom
    const mixPass = finalComposer.passes[1] as ShaderPass
    // @ts-ignore access to material uniforms
    mixPass.uniforms.tBloom.value = (bloomComposer as any).renderTarget2.texture
    finalComposer.render(delta)
  }, 1)

  useEffect(() => {
    return () => {
      globalComposer.dispose()
      bloomComposer.dispose()
      finalComposer.dispose()
      darkMaterial.dispose()
    }
  }, [globalComposer, bloomComposer, finalComposer, darkMaterial])

  return null
}
