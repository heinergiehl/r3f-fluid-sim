# r3f-fluid-sim

Real-time 2D fluid velocity simulation for React Three Fiber.

## Install

```
npm install r3f-fluid-sim
```

Peer dependencies:

- `react`
- `react-dom`
- `three`
- `@react-three/fiber`
- `@react-three/drei`

## Usage

```tsx
import { Canvas } from '@react-three/fiber'
import { FluidSimulation, useFluid } from 'r3f-fluid-sim'

function ParticlesFromFluid() {
  const { velocityFBO } = useFluid()
  // Use velocityFBO in your shaders/materials.
  return null
}

export function Scene() {
  return (
    <Canvas>
      <FluidSimulation>
        <ParticlesFromFluid />
      </FluidSimulation>
    </Canvas>
  )
}
```

### Props

- `size`, `viscosity`, `viscousIterations`, `pressureIterations`
- `dt`, `advectionDecay`
- `forceRadius`, `forceStrength`, `forceClamp`
- `bfecc`, `interaction`, `pointer`

## License

MIT
