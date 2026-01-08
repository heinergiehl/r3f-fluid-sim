uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
    float L = texture2D(pressure, vUv - vec2(texelSize.x, 0.0)).x;
    float R = texture2D(pressure, vUv + vec2(texelSize.x, 0.0)).x;
    float T = texture2D(pressure, vUv + vec2(0.0, texelSize.y)).x;
    float B = texture2D(pressure, vUv - vec2(0.0, texelSize.y)).x;

    float div = texture2D(divergence, vUv).x;

    float newP = (L + R + T + B - div) * 0.25;

    gl_FragColor = vec4(newP, 0.0, 0.0, 1.0);
}
