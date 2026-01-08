uniform sampler2D velocity;
uniform sampler2D uSource; // The quantity to advect
uniform float dt; // Timestep
uniform vec2 fboSize;
uniform float decay;
uniform bool isBFECC;

varying vec2 vUv;

void main() {
    vec2 texelSize = 1.0 / fboSize;
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;

    if (!isBFECC) {
        // Standard Semi-Lagrangian Advection
        vec2 vel = texture2D(velocity, vUv).xy;
        vec2 coord = vUv - vel * dt * ratio * texelSize;

        vec4 result = texture2D(uSource, coord);
        gl_FragColor = result * decay;
        return;
    }

    // BFECC (Back and Forth Error Compensation and Correction)
    vec2 spot_new = vUv;
    vec2 vel_old = texture2D(velocity, vUv).xy;

    // back trace
    vec2 spot_old = spot_new - vel_old * dt * ratio * texelSize;
    vec2 vel_new1 = texture2D(velocity, spot_old).xy;

    // forward trace
    vec2 spot_new2 = spot_old + vel_new1 * dt * ratio * texelSize;

    vec2 error = spot_new2 - spot_new;

    vec2 spot_new3 = spot_new - error / 2.0;
    vec2 vel_2 = texture2D(velocity, spot_new3).xy;

    // back trace 2
    vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio * texelSize;

    vec4 result = texture2D(uSource, spot_old2); 

    // Apply optional decay/dissipation
    gl_FragColor = result * decay;
}
