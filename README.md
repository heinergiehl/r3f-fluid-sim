# React Three Fiber GPGPU Starter

This is a starter project for GPGPU (General-Purpose computing on Graphics Processing Units) using React Three Fiber, Three.js, and FBOs (Frame Buffer Objects).

## Structure

- **src/App.jsx**: Main entry point, sets up the Canvas.
- **src/Particles.jsx**: The core component.
  - Creates two FBOs (ping-pong buffers).
  - Creates a `SimulationMaterial` (for physics/logic) and a `RenderMaterial` (for visualization).
  - In `useFrame`, it runs the simulation shader, outputting to an FBO, then swaps the buffers.
- **src/shaders/**:
  - `simVertex.glsl` & `simFragment.glsl`: The logic of the simulation. This runs on every pixel of the FBO. `gl_FragColor` is the new position.
  - `renderVertex.glsl` & `renderFragment.glsl`: The visualization. The vertex shader reads the position from the FBO texture.

## How to use

1.  Run `npm install`
2.  Run `npm run dev`

## Customizing

- **Logic**: Edit `src/shaders/simFragment.glsl`. The `uPosition` texture contains the previous positions. You can add more uniforms (like mouse position) to `SimulationMaterial` in `Particles.jsx`.
- **Visuals**: Edit `src/shaders/renderFragment.glsl` or `renderVertex.glsl`.
- **Count**: Change the `size` prop on `<Particles />` in `App.jsx`. (e.g., size={512} for 262k particles).
