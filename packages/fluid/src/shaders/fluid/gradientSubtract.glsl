uniform sampler2D pressure;
uniform sampler2D velocity;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
    float L = texture2D(pressure, vUv - vec2(texelSize.x, 0.0)).x;
    float R = texture2D(pressure, vUv + vec2(texelSize.x, 0.0)).x;
    float T = texture2D(pressure, vUv + vec2(0.0, texelSize.y)).x;
    float B = texture2D(pressure, vUv - vec2(0.0, texelSize.y)).x;

    vec2 vel = texture2D(velocity, vUv).xy;

    // Subtract gradient of pressure
    vel.xy -= vec2(R - L, T - B) * 0.5;

    gl_FragColor = vec4(vel, 0.0, 1.0);
}
