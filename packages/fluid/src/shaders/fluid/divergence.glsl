uniform sampler2D velocity;
uniform vec2 texelSize; // 1 / resolution

varying vec2 vUv;

void main() {
    float L = texture2D(velocity, vUv - vec2(texelSize.x, 0.0)).x;
    float R = texture2D(velocity, vUv + vec2(texelSize.x, 0.0)).x;
    float T = texture2D(velocity, vUv + vec2(0.0, texelSize.y)).y;
    float B = texture2D(velocity, vUv - vec2(0.0, texelSize.y)).y;

    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
