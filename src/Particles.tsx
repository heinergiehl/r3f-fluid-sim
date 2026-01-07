import { useFrame, useThree, extend, ReactThreeFiber } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { useControls } from 'leva'

// Import shaders
import simVertex from './shaders/simVertex.glsl'
import simFragment from './shaders/simFragment.glsl'
import renderVertex from './shaders/renderVertex.glsl'
import renderFragment from './shaders/renderFragment.glsl'

// Define shader materials
const SimulationMaterial = shaderMaterial(
  {
    uPosition: new THREE.Texture(),
    uTime: 0,
    uCurlFreq: 0.25,
    uSpeed: 0.1,
  },
  simVertex,
  simFragment
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
          uTime?: number
          uCurlFreq?: number
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

const getDatatexture = (size: number) => {
  const number = size * size
  const data = new Float32Array(4 * number)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const index = (i * size + j) * 4
      // random positions between -10 and 10 to match shader wrapping
      data[index] = (Math.random() - 0.5) * 20
      data[index + 1] = (Math.random() - 0.5) * 20
      data[index + 2] = (Math.random() - 0.5) * 10 // z between -5 and 5
      data[index + 3] = 1.0
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
  return texture
}

interface ParticlesProps {
    size?: number
}

const Particles = ({ size = 256 }: ParticlesProps) => {
  const { gl } = useThree()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderMaterialRef = useRef<THREE.ShaderMaterial>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simMaterialRef = useRef<THREE.ShaderMaterial>(null!)

  const { curlFreq, speed, particleSize, color1, color2 } = useControls({
    curlFreq: { value: 0.25, min: 0.0, max: 1.0, step: 0.01 },
    speed: { value: 0.1, min: 0.0, max: 0.5, step: 0.001 },
    particleSize: { value: 50, min: 1, max: 200, step: 1 },
    color1: '#1a66e6',
    color2: '#e61a80',
  })

  // 1. Setup the FBOs (Ping-Pong buffers)
  const fbo = useMemo(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1)
    camera.position.z = 1

    const opts: THREE.RenderTargetOptions = {
      minFilter: THREE.NearestFilter, // Important for data textures
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType, // FloatType is essential for positions
    }

    const t1 = new THREE.WebGLRenderTarget(size, size, opts)
    const t2 = new THREE.WebGLRenderTarget(size, size, opts)

    return {
       scene,
       camera,
       curr: t1,
       prev: t2
    }
  }, [size])

  // 2. Setup the full-screen quad for simulation
  const simMesh = useMemo(() => {
      const geometry = new THREE.PlaneGeometry(2, 2)
      // Initial state uses the DataTexture
      const material = new SimulationMaterial({
          uPosition: getDatatexture(size), 
      } as any)
      const mesh = new THREE.Mesh(geometry, material)
      fbo.scene.add(mesh)
      return mesh
  }, [fbo.scene, size])


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

  useFrame((state) => {
    // 1. Update Simulation State
    // @ts-ignore
    simMesh.material.uniforms.uTime.value = state.clock.elapsedTime
    // @ts-ignore
    simMesh.material.uniforms.uCurlFreq.value = curlFreq
    // @ts-ignore
    simMesh.material.uniforms.uSpeed.value = speed
    
    // 2. Render Simulation to Current FBO
    state.gl.setRenderTarget(fbo.curr)
    state.gl.clear()
    state.gl.render(fbo.scene, fbo.camera)
    state.gl.setRenderTarget(null)

    // 3. Update Materials with the result
    if (renderMaterialRef.current) {
        renderMaterialRef.current.uniforms.uPosition.value = fbo.curr.texture
        renderMaterialRef.current.uniforms.uSize.value = particleSize
        renderMaterialRef.current.uniforms.uColor1.value = new THREE.Color(color1)
        renderMaterialRef.current.uniforms.uColor2.value = new THREE.Color(color2)
    }
    
    // 4. Prepare for next frame
    // @ts-ignore
    simMesh.material.uniforms.uPosition.value = fbo.curr.texture
    
    // Swap buffers
    const tmp = fbo.curr
    fbo.curr = fbo.prev
    fbo.prev = tmp
  })

  return (
    <points geometry={particlesGeo}>
      {/* @ts-ignore */}
      <renderMaterial 
        ref={renderMaterialRef} 
        transparent={true} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
      />
    </points>
  )
}

export default Particles
