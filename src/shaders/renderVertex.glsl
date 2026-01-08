uniform sampler2D uPosition;
uniform float uSize; // Size of the point
attribute vec2 aParticlesUv; // Used to lookup position in texture
varying vec3 vPos;
varying float vLife; // Pass life to fragment
varying vec2 vParticleUv; // Pass UV to fragment for dye lookup

void main() {
    // Read position data from the simulation texture
    vec4 particlePos = texture2D(uPosition, aParticlesUv);
    vLife = particlePos.a; // Read life from alpha
    vParticleUv = aParticlesUv; // Pass UV for dye texture lookup

    vPos = particlePos.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(particlePos.xyz, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation (in 2D with orthographic camera z is constant, but if perspective camera is used this works)
    // If z is 0, mvPosition.z is -cameraZ (approx -5). 
    gl_PointSize = uSize * (10.0 / -mvPosition.z);
}
