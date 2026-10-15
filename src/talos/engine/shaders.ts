/** GLSL for particles, the authority ring, and connecting threads. */

export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;
uniform float uScale;
uniform float uCenterZ;
uniform vec3 uPointer;
uniform float uPointerStrength;
attribute vec3 aColor;
attribute vec4 aParams; // alpha, size, activity, seed
varying vec3 vColor;
varying float vAlpha;

void main() {
  float seed = aParams.w;
  float activity = aParams.z;
  vec3 p = position;
  // Internal motion: small, seeded drift whose speed follows activity.
  float speed = 0.6 + activity * 2.2;
  float amp = 0.006 + activity * 0.022;
  p += amp * vec3(
    sin(uTime * speed * (0.8 + seed) + seed * 40.0),
    cos(uTime * speed * (0.7 + seed * 0.6) + seed * 23.0),
    sin(uTime * speed * (0.9 + seed * 0.4) + seed * 61.0)
  );
  // Pointer: particles near the cursor ease gently aside.
  vec3 away = p - uPointer;
  float d = length(away.xy);
  float push = uPointerStrength * exp(-d * d / 0.09);
  p.xy += normalize(away.xy + 1e-5) * push * 0.08;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  // Depth cue: the far hemisphere recedes into the page.
  float depth = clamp((mv.z - uCenterZ) / max(uScale, 0.001), -1.2, 1.2);
  float near = smoothstep(-1.1, 1.0, depth);
  vAlpha = aParams.x * mix(0.16, 1.0, near);
  vColor = mix(aColor * 0.4 + 0.6 * vec3(0.8, 0.83, 0.86), aColor, near);
  float size = uBaseSize * aParams.y * mix(0.6, 1.25, near);
  gl_PointSize = size * uPixelRatio * (8.0 / -mv.z);
}
`;

export const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float a = smoothstep(0.5, 0.32, r) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

export const ringVertex = /* glsl */ `
varying vec2 vPos;
uniform float uHalf;
void main() {
  vPos = position.xy * uHalf;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Analytic ring with fwidth anti-aliasing. Used for the bronze authority
 * boundary and, in dashed mode, the checkpoint outline.
 */
export const ringFragment = /* glsl */ `
varying vec2 vPos;
uniform float uRadius;
uniform float uPx;
uniform vec3 uColor;
uniform vec3 uHotColor;
uniform float uOpacity;
uniform float uHoldAngle;
uniform float uHold;
uniform float uGate;
uniform float uGateAngle;
uniform float uTime;
uniform float uDashed;
uniform float uTicks;

float angleDelta(float a, float b) {
  float d = mod(a - b + 3.14159265, 6.2831853) - 3.14159265;
  return abs(d);
}

void main() {
  float d = length(vPos);
  float w = fwidth(d);
  float a = atan(vPos.y, vPos.x);
  float hold = uHold * exp(-pow(angleDelta(a, uHoldAngle), 2.0) / 0.035);
  float pulse = 0.72 + 0.28 * sin(uTime * 2.6);
  float thickness = uPx * (0.65 + 1.4 * hold);
  float line = 1.0 - smoothstep(thickness - w, thickness + w, abs(d - uRadius));
  // Instrument graduations, kept faint so the ring reads as one line.
  float tickStep = 6.2831853 / 72.0;
  float k = fract(a / tickStep + 0.5) - 0.5;
  float arc = abs(k) * tickStep * d;
  float major = 1.0 - step(0.06, abs(fract(a / 1.5707963 + 0.5) - 0.5));
  float tickLen = mix(4.0, 9.0, major) * uPx;
  float tick = (1.0 - smoothstep(uPx * 0.5, uPx * 0.5 + w, arc))
    * step(uRadius + 3.0 * uPx, d) * step(d, uRadius + 3.0 * uPx + tickLen)
    * mix(0.22, 0.55, major) * uTicks;
  // The gate opens briefly where an approved action crosses.
  float gate = uGate * exp(-pow(angleDelta(a, uGateAngle), 2.0) / 0.006);
  float dash = mix(1.0, step(0.45, fract(a * 9.5492966)), uDashed);
  float alpha = max(line * dash * (1.0 - gate), tick) * uOpacity;
  alpha = max(alpha, line * hold * pulse * (1.0 - gate));
  if (alpha < 0.004) discard;
  vec3 color = mix(uColor, uHotColor, clamp(hold * pulse, 0.0, 1.0));
  gl_FragColor = vec4(color, alpha);
}
`;

export const threadVertex = /* glsl */ `
attribute float aT;
attribute vec3 aStyle; // kind, flow, alpha
varying float vT;
varying vec3 vStyle;
void main() {
  vT = aT;
  vStyle = aStyle;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const threadFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uInk;
uniform vec3 uBronze;
uniform vec3 uCool;
varying float vT;
varying vec3 vStyle;
void main() {
  float kind = vStyle.x;
  float flow = vStyle.y;
  float alpha = vStyle.z;
  vec3 color = kind < 0.5 ? uInk : kind < 1.5 ? uBronze : uCool;
  float base = kind < 0.5 ? 0.3 : kind < 1.5 ? 0.5 : 0.38;
  // Transferred context travels along the thread as a soft pulse.
  float travel = fract(uTime * 0.55);
  float pulse = exp(-pow((vT - travel) * 7.0, 2.0)) * flow;
  float fade = smoothstep(0.0, 0.12, vT) * smoothstep(1.0, 0.88, vT);
  float a = (base + pulse * 0.7) * alpha * fade;
  if (a < 0.004) discard;
  gl_FragColor = vec4(color, a);
}
`;
