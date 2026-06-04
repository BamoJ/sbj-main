precision highp float;

// GPU particle physics. One texel = one particle.
// Channels: xy = position (pixels), zw = velocity (pixels/frame).
uniform sampler2D uPrev;     // previous position+velocity
uniform sampler2D uOrigin;   // per-particle home position (xy)
uniform vec2 uMouse;         // mouse in drawing-buffer pixels
uniform float uHasImpulse;   // 1.0 while a recent mouse move is still pushing
uniform float uDistortionRadius;
uniform float uForceStrength;
uniform float uMaxDisplacement;
uniform float uReturnForce;
uniform float uDamping;
uniform float uTime;         // seconds — animates the flow field
uniform float uFlowStrength; // ambient curl-noise drift (fluidity)
uniform float uFlowScale;    // spatial scale of the flow (smaller = bigger eddies)

varying vec2 vUv;

// ── 2D simplex noise (Ashima / McEwan-Gustavson) ─────────────────────────
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Divergence-free curl of a noise potential → swirling, fluid-looking flow.
vec2 curlFlow(vec2 p) {
  float e = 0.08;
  float nx1 = snoise(p + vec2(0.0, e));
  float nx2 = snoise(p - vec2(0.0, e));
  float ny1 = snoise(p + vec2(e, 0.0));
  float ny2 = snoise(p - vec2(e, 0.0));
  return vec2(nx1 - nx2, ny2 - ny1) / (2.0 * e);
}

void main() {
  vec4 prev = texture2D(uPrev, vUv);
  vec2 pos = prev.xy;
  vec2 vel = prev.zw;
  vec2 origin = texture2D(uOrigin, vUv).xy;

  float r2 = uDistortionRadius * uDistortionRadius;

  // Mouse repulsion — smooth radial window, no hard rim.
  if (uHasImpulse > 0.5) {
    vec2 d = uMouse - pos;
    float dist2 = dot(d, d);
    if (dist2 > 0.0) {
      float dist = sqrt(dist2);
      float window = 1.0 - smoothstep(uDistortionRadius * 0.5, uDistortionRadius, dist);
      if (window > 0.0) {
        float force = -r2 / dist2;
        float angle = atan(d.y, d.x);
        float distFromOrigin = length(pos - origin);
        float forceMultiplier = max(0.1, 1.0 - distFromOrigin / (uMaxDisplacement * 2.0));
        vel.x += force * cos(angle) * uForceStrength * forceMultiplier * window;
        vel.y += force * sin(angle) * uForceStrength * forceMultiplier * window;
      }
    }
  }

  // Ambient curl-noise flow — gives the field a continuous, fluid drift instead
  // of stiff straight-line returns. Animated over time so it never settles dead.
  // Gated: when flow is off (uFlowStrength == 0) the 4 simplex taps are skipped.
  if (uFlowStrength > 0.0001) {
    vec2 fp = pos * uFlowScale + vec2(uTime * 0.06, uTime * 0.05);
    vel += curlFlow(fp) * uFlowStrength;
  }

  // Damping.
  vel *= uDamping;

  // Spring back toward origin.
  vec2 target = pos + vel + (origin - pos) * uReturnForce;
  vec2 offset = target - origin;
  float distFromOrigin = length(offset);

  // Soft displacement limit — elastic compression past the cap, no hard wall.
  vec2 newPos;
  if (distFromOrigin > uMaxDisplacement && distFromOrigin > 0.0) {
    float excess = distFromOrigin - uMaxDisplacement;
    float scale = uMaxDisplacement / distFromOrigin;
    float dampedScale = scale + (1.0 - scale) * exp(-excess * 0.02);
    newPos = origin + offset * dampedScale;
    vel *= 0.9;
  }
  else {
    newPos = target;
  }

  gl_FragColor = vec4(newPos, vel);
}
