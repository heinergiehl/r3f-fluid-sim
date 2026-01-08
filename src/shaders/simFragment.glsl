uniform sampler2D uPosition;
uniform sampler2D uInitialPosition; // Helper to reset particles
uniform sampler2D uVelocity; // From Fluid Engine
uniform vec2 uWorldSize; // World width/height for mapping and wrapping
uniform float uTime;
uniform float uSpeed;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec4 pos = texture(uPosition, vUv);
    vec4 initPos = texture(uInitialPosition, vUv);
    // Life is stored in alpha channel
    float life = pos.a;
    life -= 0.005; // Decay rate

    // Respawn logic
    if (life <= 0.0) {
        fragColor = vec4(initPos.xyz, 1.0); // Reset position and full life
        return;
    }

    // Map world position to fluid UV (0..1)
    vec2 fluidUv = (pos.xy / uWorldSize) + 0.5;

    // Sample velocity from fluid simulation
    vec3 flow = texture(uVelocity, fluidUv).rgb;

    // Update position
    vec3 velocity = flow * uSpeed; 
    vec3 newPos = pos.xyz + velocity;

    // Wrapping logic 
    vec2 halfWorld = uWorldSize * 0.5;
    if (newPos.x > halfWorld.x) newPos.x -= uWorldSize.x;
    if (newPos.x < -halfWorld.x) newPos.x += uWorldSize.x;
    if (newPos.y > halfWorld.y) newPos.y -= uWorldSize.y;
    if (newPos.y < -halfWorld.y) newPos.y += uWorldSize.y;

    // Force Z to 0
    newPos.z = 0.0;

    fragColor = vec4(newPos, life);
}
