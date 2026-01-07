import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import Particles from "./Particles";
import { Leva } from "leva";

function App() {
  return (
    <>
      <Leva collapsed={false} />
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: false }}
      >
        <color attach="background" args={["#000000"]} />

        <Stats />
        <Particles size={256} />

        <OrbitControls />
      </Canvas>
    </>
  );
}

export default App;
