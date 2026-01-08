uniform sampler2D velocity;
uniform sampler2D uSource; // The texture to add into (velocity here)
uniform vec2 point; // Mouse position in UV
uniform vec3 color;
uniform float radius;
uniform vec2 fboSize;

varying vec2 vUv;

void main() {
    vec2 p = vUv - point;
    // Adjust aspect ratio for circular impulse
    p.x *= fboSize.x / fboSize.y;

    // Gaussian falloff
    float impulse = exp(-dot(p, p) / radius);

    vec3 base = texture2D(uSource, vUv).xyz;
    gl_FragColor = vec4(base + color * impulse, 1.0);
}
