varying vec3 vPos;
varying float vDistance;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
    // Soft circular particle
    vec2 uv = gl_PointCoord.xy - 0.5;
    float dist = length(uv);

    // Nice soft glow falloff
    float alpha = 0.5 / (dist * dist * 10.0 + 0.1); // Inverse square fade-ish

    // Hard cutoff at edge
    if (dist > 0.5) discard;

    // Color mapping based on position
    // Map -10..10 to 0..1 roughly
    vec3 mixColor = (vPos + 10.0) * 0.05; 

    // Beautiful palette: Customizable
    vec3 col1 = uColor1; 
    vec3 col2 = uColor2; 

    vec3 finalColor = mix(col1, col2, sin(vPos.x * 0.2 + vPos.y * 0.3) * 0.5 + 0.5);

    // Boost brightness for additive blending
    gl_FragColor = vec4(finalColor, alpha);
}
