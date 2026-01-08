import { useFrame, useThree, extend } from '@react-three/fiber'
import { useEffect, useMemo, useRef, createContext, useContext } from 'react'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'

import faceVert from './shaders/fluid/face.vert'
import advectionFrag from './shaders/fluid/advection.glsl'
import velocityImpulseFrag from './shaders/fluid/velocityImpulse.glsl'
import divergenceFrag from './shaders/fluid/divergence.glsl'
import pressureFrag from './shaders/fluid/pressure.glsl'
import gradientSubtractFrag from './shaders/fluid/gradientSubtract.glsl'
import viscousFrag from './shaders/fluid/viscous.glsl'

// --- 1. Define Materials ---

const AdvectionMaterial = shaderMaterial(
  {
    velocity: new THREE.Texture(),
    uSource: new THREE.Texture(),
    dt: 0.016,
    fboSize: new THREE.Vector2(128, 128),
    decay: 0.98,
    isBFECC: true,
  },
  faceVert,
  advectionFrag
)

const VelocityImpulseMaterial = shaderMaterial(
    {
        velocity: new THREE.Texture(),
        uSource: new THREE.Texture(),
        point: new THREE.Vector2(0, 0),
        color: new THREE.Vector3(1, 1, 1),
        radius: 0.001,
        fboSize: new THREE.Vector2(128, 128),
    },
    faceVert,
    velocityImpulseFrag
)

const DivergenceMaterial = shaderMaterial(
    {
        velocity: new THREE.Texture(),
        texelSize: new THREE.Vector2(1/128, 1/128),
    },
    faceVert,
    divergenceFrag
)

const PressureMaterial = shaderMaterial(
    {
        pressure: new THREE.Texture(),
        divergence: new THREE.Texture(),
        texelSize: new THREE.Vector2(1/128, 1/128),
    },
    faceVert,
    pressureFrag
)

const GradientSubtractMaterial = shaderMaterial(
    {
        pressure: new THREE.Texture(),
        velocity: new THREE.Texture(),
        texelSize: new THREE.Vector2(1/128, 1/128),
    },
    faceVert,
    gradientSubtractFrag
)

const ViscousMaterial = shaderMaterial(
    {
        velocity: new THREE.Texture(),
        velocity_new: new THREE.Texture(),
        v: 1.0,
        dt: 0.016,
        texelSize: new THREE.Vector2(1/128, 1/128),
    },
    faceVert,
    viscousFrag
)

extend({ 
    AdvectionMaterial, 
    VelocityImpulseMaterial, 
    DivergenceMaterial, 
    PressureMaterial, 
    GradientSubtractMaterial, 
    ViscousMaterial
})

// --- 2. Fluid Context ---

interface DoubleFBO {
    read: THREE.WebGLRenderTarget
    write: THREE.WebGLRenderTarget
    swap: () => void
}

interface FluidContextType {
    velocityFBO: DoubleFBO | null
    fboSize: number
}

const FluidContext = createContext<FluidContextType>({ velocityFBO: null, fboSize: 128 })

export const useFluid = () => useContext(FluidContext)

// --- 3. Helper Functions ---

// Helper for FBO creation
const createFBO = (w: number, h: number, type: THREE.TextureDataType = THREE.FloatType) => {
    return new THREE.WebGLRenderTarget(w, h, {
        type: type,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter, // Changed to Linear for smooth display
        magFilter: THREE.LinearFilter, // Changed to Linear for smooth display
        depthBuffer: false,
        stencilBuffer: false,
    })
}

// Helper for Ping-Pong pairs
const createDoubleFBO = (w: number, h: number, type: THREE.TextureDataType = THREE.FloatType) => {
    return {
        read: createFBO(w, h, type),
        write: createFBO(w, h, type),
        swap: function() {
            const temp = this.read
            this.read = this.write
            this.write = temp
        }
    }
}



export interface FluidSimulationProps extends React.PropsWithChildren {
    size?: number
    viscosity?: number
    viscousIterations?: number
    pressureIterations?: number
    dt?: number
    advectionDecay?: number
    forceRadius?: number
    forceStrength?: number
    forceClamp?: number
    bfecc?: boolean
    interaction?: boolean
    pointer?: THREE.Vector2
}

export const FluidSimulation = ({
    size = 128,
    viscosity = 0.05,
    viscousIterations = 20,
    pressureIterations = 20,
    dt = 0.01,
    advectionDecay = 0.98,
    forceRadius = 0.0025,
    forceStrength = 1.0,
    forceClamp = 3.0,
    bfecc = true,
    interaction = true,
    pointer,
    children
}: FluidSimulationProps) => {
    const { gl } = useThree()
    
    // FBOs - Only velocity and pressure for physically correct simulation
    const velocity = useMemo(() => createDoubleFBO(size, size), [size])
    const pressure = useMemo(() => createDoubleFBO(size, size), [size])
    const divergence = useMemo(() => createFBO(size, size), [size])
    
    // Materials
    const materials = useMemo(() => ({
        advection: new AdvectionMaterial(),
        velocityImpulse: new VelocityImpulseMaterial(),
        divergence: new DivergenceMaterial(),
        pressure: new PressureMaterial(),
        gradientSubtract: new GradientSubtractMaterial(),
        viscous: new ViscousMaterial(),
    }), [])

    const scene = useMemo(() => new THREE.Scene(), [])
    const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

    // Full screen quad mesh (shared geometry)
    const fsQuad = useMemo(() => {
        const geom = new THREE.PlaneGeometry(2, 2)
        const mesh = new THREE.Mesh(geom, materials.advection)
        scene.add(mesh)
        return mesh
    }, [materials, scene])

    // Refs for interaction
    const lastPointerUv = useRef(new THREE.Vector2(0.5, 0.5))
    const pointerUv = useMemo(() => new THREE.Vector2(), [])
    const pointerDelta = useMemo(() => new THREE.Vector2(), [])

    useFrame((state, delta) => {
        // 1. ADVECTION - Velocity
        fsQuad.material = materials.advection
        materials.advection.uniforms.velocity.value = velocity.read.texture
        materials.advection.uniforms.uSource.value = velocity.read.texture
        materials.advection.uniforms.dt.value = dt
        materials.advection.uniforms.fboSize.value.set(size, size)
        materials.advection.uniforms.isBFECC.value = bfecc
        materials.advection.uniforms.decay.value = advectionDecay
        
        gl.setRenderTarget(velocity.write)
        gl.render(scene, camera)
        velocity.swap()

        // 2. EXTERNAL FORCES (Pointer)
        const sourcePointer = pointer ?? state.pointer
        pointerUv.set(sourcePointer.x * 0.5 + 0.5, sourcePointer.y * 0.5 + 0.5)

        if (interaction) {
            pointerDelta.copy(pointerUv).sub(lastPointerUv.current)

            const safeDelta = Math.max(delta, 1 / 120)
            const mouseVel = pointerDelta.multiplyScalar(forceStrength / safeDelta)

            if (forceClamp > 0 && mouseVel.lengthSq() > forceClamp * forceClamp) {
                mouseVel.setLength(forceClamp)
            }

            if (
                mouseVel.lengthSq() > 0 &&
                pointerUv.x >= 0 &&
                pointerUv.x <= 1 &&
                pointerUv.y >= 0 &&
                pointerUv.y <= 1
            ) {
                // Velocity impulse
                fsQuad.material = materials.velocityImpulse
                materials.velocityImpulse.uniforms.velocity.value = velocity.read.texture
                materials.velocityImpulse.uniforms.uSource.value = velocity.read.texture
                
                materials.velocityImpulse.uniforms.point.value.set(
                    pointerUv.x, 
                    pointerUv.y
                )
                materials.velocityImpulse.uniforms.color.value.set(mouseVel.x, mouseVel.y, 0)
                materials.velocityImpulse.uniforms.radius.value = forceRadius
                materials.velocityImpulse.uniforms.fboSize.value.set(size, size)

                gl.setRenderTarget(velocity.write)
                gl.render(scene, camera)
                velocity.swap()
            }
        }
        lastPointerUv.current.copy(pointerUv)

        // 3. VISCOSITY
        // Iterative smoothing of velocity
        if (viscosity > 0) {
            fsQuad.material = materials.viscous
            materials.viscous.uniforms.v.value = viscosity
            materials.viscous.uniforms.dt.value = dt
            materials.viscous.uniforms.texelSize.value.set(1/size, 1/size)
            
            // Loop for viscosity (Jacobi diffusion)
            for (let i = 0; i < viscousIterations; i++) {
                materials.viscous.uniforms.velocity_new.value = velocity.read.texture 
                materials.viscous.uniforms.velocity.value = velocity.read.texture 
                gl.setRenderTarget(velocity.write)
                gl.render(scene, camera)
                velocity.swap()
            }
        }
        
        // 4. DIVERGENCE
        fsQuad.material = materials.divergence
        materials.divergence.uniforms.velocity.value = velocity.read.texture
        materials.divergence.uniforms.texelSize.value.set(1/size, 1/size)
        
        gl.setRenderTarget(divergence)
        gl.render(scene, camera)

        // 5. PRESSURE
        // Jacobi iteration
        fsQuad.material = materials.pressure
        materials.pressure.uniforms.divergence.value = divergence.texture
        materials.pressure.uniforms.texelSize.value.set(1/size, 1/size)
        
        // Clear pressure to 0 typically? or reuse last frame? Reuse last frame is better (warm start)
        for (let i = 0; i < pressureIterations; i++) {
            materials.pressure.uniforms.pressure.value = pressure.read.texture
            gl.setRenderTarget(pressure.write)
            gl.render(scene, camera)
            pressure.swap()
        }

        // 6. GRADIENT SUBTRACT
        fsQuad.material = materials.gradientSubtract
        materials.gradientSubtract.uniforms.pressure.value = pressure.read.texture
        materials.gradientSubtract.uniforms.velocity.value = velocity.read.texture
        materials.gradientSubtract.uniforms.texelSize.value.set(1/size, 1/size)
        
        gl.setRenderTarget(velocity.write)
        gl.render(scene, camera)
        velocity.swap()
        
        gl.setRenderTarget(null)
    }, -1)

    useEffect(() => {
        return () => {
            velocity.read.dispose()
            velocity.write.dispose()
            pressure.read.dispose()
            pressure.write.dispose()
            divergence.dispose()
        }
    }, [velocity, pressure, divergence])

    useEffect(() => {
        return () => {
            fsQuad.geometry.dispose()
            materials.advection.dispose()
            materials.velocityImpulse.dispose()
            materials.divergence.dispose()
            materials.pressure.dispose()
            materials.gradientSubtract.dispose()
            materials.viscous.dispose()
        }
    }, [materials, fsQuad])

    return (
        <FluidContext.Provider value={{ velocityFBO: velocity, fboSize: size }}>
            {children}
        </FluidContext.Provider>
    )
}
