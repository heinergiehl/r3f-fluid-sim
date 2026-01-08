uniform sampler2D uTexture;  // Now velocity texture, not density!
varying vec2 vUv;

// Customizable uniforms
uniform float uBrightness;    // 0.5-2.0, controls overall brightness
uniform float uContrast;      // 0.5-2.0, controls contrast
uniform float uSaturation;    // 0.0-2.0, color saturation
uniform float uOpacity;       // 0.0-1.0, overall opacity
uniform int uMode;            // 0=realistic, 1=ink, 2=smoke, 3=neon

void main() {
    // Sample velocity texture (like mofu-dev does)
    vec2 vel = texture2D(uTexture, vUv).xy;
    float len = length(vel);

    // Normalize velocity from [-1,1] to [0,1] for color mapping
    vel = vel * 0.5 + 0.5;

    // Convert velocity to color (red=x velocity, green=y velocity, blue=constant)
    vec3 dye = vec3(vel.x, vel.y, 1.0);

    vec3 color;
    float alpha;

    if (uMode == 0) {
        // Realistic mode - darker, natural colors
        color = dye * uBrightness * 2.0;
        color = pow(color, vec3(1.0 / uContrast));
        alpha = smoothstep(0.01, 0.5, len) * uOpacity;
    }
    else if (uMode == 1) {
        // Ink mode - deep, saturated colors
        color = dye * uBrightness * 1.5;
        // Boost saturation
        float gray = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(gray), color, uSaturation);
        color = pow(color, vec3(0.8));
        alpha = smoothstep(0.01, 0.6, len) * uOpacity;
    }
    else if (uMode == 2) {
        // Smoke mode - soft, diffuse, lighter
        color = dye * 0.5 + 0.5;
        color = mix(vec3(0.8), color, len * 0.6);
        color *= uBrightness;
        alpha = smoothstep(0.01, 0.5, len) * uOpacity * 0.8;
    }
    else {
        // Neon mode - bright, glowing colors
        color = dye * uBrightness * 2.5;
        color += pow(len, 2.0) * 0.5;
        color = pow(color, vec3(0.7));
        alpha = smoothstep(0.01, 0.6, len) * uOpacity;
    }    
    gl_FragColor = vec4(color, alpha);
}    