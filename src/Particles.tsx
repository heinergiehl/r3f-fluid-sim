import { useFrame, useThree, extend, ReactThreeFiber } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { useFluid } from 'r3f-fluid-sim' // Import useFluid

// Import shaders
import simVertex from './shaders/simVertex.glsl'
import simFragment from './shaders/simFragment.glsl'
import renderVertex from './shaders/renderVertex.glsl'
import renderFragment from './shaders/renderFragment.glsl'

// Define shader materials
const SimulationMaterial = shaderMaterial(
  {
    uPosition: new THREE.Texture(),
    uInitialPosition: new THREE.Texture(), // Store initial positions for respawn
    uVelocity: new THREE.Texture(),
    uWorldSize: new THREE.Vector2(1, 1),
    uTime: 0,
    uSpeed: 0.1,
  },
  simVertex,
  simFragment,
  (material) => {
    material!.glslVersion = THREE.GLSL3
  }
)

const RenderMaterial = shaderMaterial(
  {
    uPosition: new THREE.Texture(),
    uSize: 50.0,
    uColor1: new THREE.Color(0.1, 0.4, 0.9),
    uColor2: new THREE.Color(0.9, 0.1, 0.5),
  },
  renderVertex,
  renderFragment
)

extend({ SimulationMaterial, RenderMaterial })

// Add types to R3F catalog
declare global {
  namespace JSX {
    interface IntrinsicElements {
      simulationMaterial: ReactThreeFiber.Object3DNode<THREE.ShaderMaterial, typeof SimulationMaterial> & {
          uPosition?: THREE.Texture
          uInitialPosition?: THREE.Texture
          uVelocity?: THREE.Texture
          uWorldSize?: THREE.Vector2
          uTime?: number
          uSpeed?: number
      }
      renderMaterial: ReactThreeFiber.Object3DNode<THREE.ShaderMaterial, typeof RenderMaterial> & {
          uPosition?: THREE.Texture
          uSize?: number
          uColor1?: THREE.Color
          uColor2?: THREE.Color
      }
    }
  }
}

const createPositionTexture = (size: number, worldSize: THREE.Vector2) => {
  const number = size * size
  const data = new Float32Array(4 * number)

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const index = (i * size + j) * 4
      // Random positions covering the world bounds
      data[index] = (Math.random() - 0.5) * worldSize.x
      data[index + 1] = (Math.random() - 0.5) * worldSize.y
      data[index + 2] = 0.0 // 2D only
      data[index + 3] = Math.random() // Random initial life
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.FloatType
  )
  texture.needsUpdate = true
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}

const createDoubleFBO = (size: number) => {
  const opts: THREE.RenderTargetOptions = {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    depthBuffer: false,
    stencilBuffer: false,
  }

  return {
    read: new THREE.WebGLRenderTarget(size, size, opts),
    write: new THREE.WebGLRenderTarget(size, size, opts),
    swap: function() {
      const temp = this.read
      this.read = this.write
      this.write = temp
    }
  }
}

export interface ParticlesProps {
  size?: number
  speed?: number
  particleSize?: number
  color1?: THREE.ColorRepresentation
  color2?: THREE.ColorRepresentation
  worldSize?: THREE.Vector2 | [number, number]
}

const Particles = ({
  size = 256,
  speed = 0.1,
  particleSize = 50,
  color1 = '#1a66e6',
  color2 = '#e61a80',
  worldSize
}: ParticlesProps) => {
  const { viewport } = useThree()
  const { velocityFBO } = useFluid()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderMaterialRef = useRef<THREE.ShaderMaterial>(null!)
  const initialized = useRef(false)

  const resolvedWorldSize = useMemo(() => {
    if (Array.isArray(worldSize)) {
      return new THREE.Vector2(worldSize[0], worldSize[1])
    }
    if (worldSize) {
      return new THREE.Vector2(worldSize.x, worldSize.y)
    }
    return new THREE.Vector2(viewport.width, viewport.height)
  }, [worldSize, viewport.width, viewport.height])

  const fallbackTexture = useMemo(() => {
    const data = new Float32Array(4)
    const texture = new THREE.DataTexture(
      data,
      1,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    texture.needsUpdate = true
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    return texture
  }, [])

  const initialPosition = useMemo(
    () => createPositionTexture(size, resolvedWorldSize),
    [size, resolvedWorldSize]
  )

  const color1Value = useMemo(() => new THREE.Color(color1), [color1])
  const color2Value = useMemo(() => new THREE.Color(color2), [color2])

  // 1. Setup the FBOs (Ping-Pong buffers for position)
  const fbo = useMemo(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    camera.position.z = 1

    return {
      scene,
      camera,
      position: createDoubleFBO(size)
    }
  }, [size])

  // 2. Setup the full-screen quad for simulation
  const simMesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new SimulationMaterial({
      uPosition: initialPosition,
      uInitialPosition: initialPosition,
      uWorldSize: resolvedWorldSize
    } as any)
    const mesh = new THREE.Mesh(geometry, material)
    fbo.scene.add(mesh)
    return mesh
  }, [fbo.scene, initialPosition, resolvedWorldSize])

  // 3. Setup the Particles Geometry
  const particlesGeo = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(size * size * 3) 
    const uvs = new Float32Array(size * size * 2) 

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = i * size + j
        positions[index * 3] = 0
        positions[index * 3 + 1] = 0
        positions[index * 3 + 2] = 0
        
        // Map strictly 0 to 1 for texture lookup
        uvs[index * 2] = (i + 0.5) / size
        uvs[index * 2 + 1] = (j + 0.5) / size
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aParticlesUv', new THREE.BufferAttribute(uvs, 2))
    return geometry
  }, [size])

  useEffect(() => {
    if (!renderMaterialRef.current) return
    renderMaterialRef.current.uniforms.uSize.value = particleSize
    renderMaterialRef.current.uniforms.uColor1.value.copy(color1Value)
    renderMaterialRef.current.uniforms.uColor2.value.copy(color2Value)
  }, [particleSize, color1Value, color2Value])

  useFrame((state) => {
    const velocityTexture = velocityFBO?.read.texture ?? fallbackTexture
    const positionInput = initialized.current
      ? fbo.position.read.texture
      : initialPosition

    // 1. Update Simulation State
    // @ts-ignore
    simMesh.material.uniforms.uTime.value = state.clock.elapsedTime
    // @ts-ignore
    simMesh.material.uniforms.uVelocity.value = velocityTexture
    // @ts-ignore
    simMesh.material.uniforms.uPosition.value = positionInput
    // @ts-ignore
    simMesh.material.uniforms.uWorldSize.value.copy(resolvedWorldSize)
    // @ts-ignore
    simMesh.material.uniforms.uSpeed.value = speed

    // 2. Render Simulation to position FBO
    state.gl.setRenderTarget(fbo.position.write)
    state.gl.clear()
    state.gl.render(fbo.scene, fbo.camera)
    state.gl.setRenderTarget(null)

    fbo.position.swap()
    initialized.current = true

    // 3. Update render material with latest positions
    if (renderMaterialRef.current) {
      renderMaterialRef.current.uniforms.uPosition.value = fbo.position.read.texture
    }
  })

  useEffect(() => {
    initialized.current = false
  }, [fbo, initialPosition])

  useEffect(() => {
    return () => {
      fallbackTexture.dispose()
    }
  }, [fallbackTexture])

  useEffect(() => {
    return () => {
      fbo.scene.remove(simMesh)
      simMesh.geometry.dispose()
      ;(simMesh.material as THREE.Material).dispose()
      particlesGeo.dispose()
      fbo.position.read.dispose()
      fbo.position.write.dispose()
      initialPosition.dispose()
    }
  }, [fbo, simMesh, particlesGeo, initialPosition])

  return (
    <>
      {/* Normal particles - keep their original colors */}
      <points geometry={particlesGeo} renderOrder={1}>
        {/* @ts-ignore */}
        <renderMaterial 
          ref={renderMaterialRef} 
          transparent={true} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </points>
    </>
  )
}

export default Particles
