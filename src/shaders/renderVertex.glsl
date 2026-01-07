uniform sampler2D uPosition;
uniform float uSize; // Size of the point
attribute vec2 aParticlesUv; // Used to lookup position in texture
varying vec3 vPos;
varying float vDistance;

void main() {
    // Read position data from the simulation texture
    vec4 particlePos = texture2D(uPosition, aParticlesUv);

    vPos = particlePos.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(particlePos.xyz, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = uSize * (1.0 / -mvPosition.z);

    // Pass depth/distance for fading
    vDistance = -mvPosition.z;
}
