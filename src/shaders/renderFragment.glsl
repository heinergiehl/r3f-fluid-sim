varying vec3 vPos;
varying float vLife;
varying vec2 vParticleUv;
uniform vec3 uColor1;
uniform vec3 uColor2;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    // Soft circular particle
    vec2 uv = gl_PointCoord.xy - 0.5;
    float dist = length(uv);

    // Nice soft glow falloff
    float alpha = 0.5 / (dist * dist * 10.0 + 0.1);

    // Fade in/out based on life
    float lifeFade = smoothstep(0.0, 0.2, vLife) * smoothstep(1.0, 0.8, vLife);
    alpha *= lifeFade;

    // Hard cutoff at edge
    if (dist > 0.5 || alpha < 0.01) discard;

    // Base particle colors - NO dye influence at all!
    vec3 col1 = uColor1; 
    vec3 col2 = uColor2; 
    float id = hash(vParticleUv * 512.0);
    float blob = noise(vParticleUv * 8.0 + id * 4.0);
    float mixVal = mix(id, blob, 0.65);
    mixVal = smoothstep(0.2, 0.8, mixVal);
    vec3 particleBase = mix(col1, col2, mixVal);

    gl_FragColor = vec4(particleBase, alpha);
}
