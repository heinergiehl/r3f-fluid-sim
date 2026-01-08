import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import Particles from "./Particles";
import { Leva, useControls } from "leva";
import { FluidSimulation } from "r3f-fluid-sim";

function App() {
  const fluidControls = useControls("Fluid Simulation", {
    viscosity: { value: 0.05, min: 0, max: 1, step: 0.001 },
    viscousIterations: { value: 20, min: 0, max: 50, step: 1 },
    pressureIterations: { value: 20, min: 1, max: 50, step: 1 },
    dt: { value: 0.01, min: 0.001, max: 0.05, step: 0.001 },
    advectionDecay: { value: 0.98, min: 0.9, max: 1, step: 0.001 },
    forceRadius: { value: 0.0025, min: 0.0005, max: 0.05, step: 0.0005 },
    forceStrength: { value: 1.0, min: 0.1, max: 10, step: 0.1 },
    forceClamp: { value: 3.0, min: 0, max: 10, step: 0.1 },
    bfecc: true,
    interaction: true,
  });

  const particleControls = useControls("Particles", {
    speed: { value: 0.01, min: 0.01, max: 0.04, step: 0.001 },
    particleSize: { value: 4, min: 0.2, max: 4, step: 0.1 },
    color1: "#1a66e6",
    color2: "#e61a80",
  });

  return (
    <>
      <Leva collapsed={false} />
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: false }}
      >
        <color attach="background" args={["#000000"]} />

        <Stats />
        <FluidSimulation
          viscosity={fluidControls.viscosity}
          viscousIterations={fluidControls.viscousIterations}
          pressureIterations={fluidControls.pressureIterations}
          dt={fluidControls.dt}
          advectionDecay={fluidControls.advectionDecay}
          forceRadius={fluidControls.forceRadius}
          forceStrength={fluidControls.forceStrength}
          forceClamp={fluidControls.forceClamp}
          bfecc={fluidControls.bfecc}
          interaction={fluidControls.interaction}
        >
          <Particles
            size={256}
            speed={particleControls.speed}
            particleSize={particleControls.particleSize}
            color1={particleControls.color1}
            color2={particleControls.color2}
          />
        </FluidSimulation>

        <OrbitControls 
          enableZoom={false}
          enableRotate={false}
          enablePan={false}
        />
      </Canvas>
    </>
  );
}

export default App;
