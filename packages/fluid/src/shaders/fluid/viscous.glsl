uniform sampler2D velocity;
uniform sampler2D velocity_new; // Sampled from the iterative process
uniform float v; // Viscosity
uniform float dt; 
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
    float L = texture2D(velocity_new, vUv - vec2(texelSize.x, 0.0)).x;
    float R = texture2D(velocity_new, vUv + vec2(texelSize.x, 0.0)).x;
    float T = texture2D(velocity_new, vUv + vec2(0.0, texelSize.y)).y;
    float B = texture2D(velocity_new, vUv - vec2(0.0, texelSize.y)).y;

    vec2 old = texture2D(velocity, vUv).xy;

    // Jacobi iteration for diffusion
    // x = (x_neighbors + alpha * b) / beta
    // For diffusion: alpha = dx^2 / (v * dt), beta = 4 + alpha
    // Simplified version from typical stable fluids:
    // This shader seems to implement a slightly different discrete version from the blog (explicit?),
    // but typically we stroke to solve (I - v dt Laplacian) u_new = u_old.
    // The blog uses: new = 4*old + v*dt*neighbors / (4 * (1 + v*dt))
    // Wait, the blog shader:
    // vec2 new = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    // new /= 4.0 * (1.0 + v * dt);

    vec2 new0 = texture2D(velocity_new, vUv + vec2(texelSize.x, 0.0)).xy;
    vec2 new1 = texture2D(velocity_new, vUv - vec2(texelSize.x, 0.0)).xy;
    vec2 new2 = texture2D(velocity_new, vUv + vec2(0.0, texelSize.y)).xy;
    vec2 new3 = texture2D(velocity_new, vUv - vec2(0.0, texelSize.y)).xy;

    vec2 newly = (old + v * dt * (new0 + new1 + new2 + new3)) / (1.0 + 4.0 * v * dt);
    // Note: The blog's formula was slightly different algebra but same concept. 
    // Standard Jacobi for diffusion: (x_center + alpha * sum_neighbors) / (1 + 4*alpha) where alpha = v * dt / dx^2
    // If dx=1, alpha = v*dt. This matches roughly.

    gl_FragColor = vec4(newly, 0.0, 1.0);
}
