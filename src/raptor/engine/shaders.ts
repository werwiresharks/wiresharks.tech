/** GLSL for particles, the authority ring, and connecting threads. */

/** How many cuts the particle shader takes. */
export const MAX_CUTS = 3;

export const particleVertex = /* glsl */ `
uniform float uDrift;
uniform float uTime;
uniform float uPixelRatio;
uniform float uBaseSize;
uniform float uScale;
uniform float uCenterZ;
uniform vec3 uPointer;
uniform float uPointerStrength;
uniform vec2 uViewport;
uniform vec4 uCutChord[${MAX_CUTS}]; // ax, ay, bx, by: viewport pixels, y down
uniform vec4 uCutMark[${MAX_CUTS}]; // bow px, half width px, reach 0..1, strike kick
attribute vec3 aColor;
attribute vec4 aParams; // alpha, size, activity, seed
varying vec3 vColor;
varying float vAlpha;

const float PI = 3.14159265;

// Where a screen point sits against a mark: signed offset across it, and the clearance particles keep from it there.
// The mark's shape is clawShape's: a bowed centre line, a body that enters sharp and bites widest past the middle,
// a pointed tip while it is still being drawn. Returns the mark's normal.
vec2 markField(vec4 chord, vec4 mark, vec2 px, out float across, out float clearance, out float along) {
  vec2 ab = chord.zw - chord.xy;
  float len = max(length(ab), 1.0);
  vec2 u = ab / len;
  vec2 n = vec2(-u.y, u.x);
  vec2 rel = px - chord.xy;
  float t = clamp(dot(rel, u) / len, 0.0, 1.0);
  across = dot(rel, n) - mark.x * sin(PI * t);
  float body = pow(max(0.0, sin(PI * min(1.0, pow(t, 0.8)))), 0.6);
  float tip = clamp((mark.z - t) / 0.06, 0.0, 1.0);
  float halfWidth = mark.y * body * tip;
  // A hairline parts nothing; an open cut keeps a margin so its torn edge and lip stay clear.
  clearance = halfWidth * 1.12 + 7.0 * smoothstep(0.0, 3.0, halfWidth);
  along = tip * smoothstep(0.0, 0.05, t);
  return n;
}

// Pixels the particle moves so the cuts show through: pushed aside across each mark, piling up along its
// edges like parted cloth, plus a brief shove when a mark strikes.
vec2 partForCuts(vec2 px) {
  vec2 shift = vec2(0.0);
  for (int k = 0; k < ${MAX_CUTS}; k++) {
    if (uCutMark[k].z <= 0.0) continue;
    float across, clearance, along;
    vec2 n = markField(uCutChord[k], uCutMark[k], px, across, clearance, along);
    float d = abs(across);
    float part = clearance * (1.0 - smoothstep(0.0, clearance * 3.0, d));
    float shove = uCutMark[k].w * 22.0 * exp(-d * d / 3200.0) * along;
    shift += n * (across < 0.0 ? -1.0 : 1.0) * (part + shove);
  }
  // Neighbouring marks can push a particle back over a cut; step it out to that cut's edge.
  vec2 moved = px + shift;
  for (int k = 0; k < ${MAX_CUTS}; k++) {
    if (uCutMark[k].z <= 0.0) continue;
    float across, clearance, along;
    vec2 n = markField(uCutChord[k], uCutMark[k], moved, across, clearance, along);
    float d = abs(across);
    if (d < clearance) {
      vec2 push = n * (across < 0.0 ? -1.0 : 1.0) * (clearance - d);
      moved += push;
      shift += push;
    }
  }
  return shift;
}

void main() {
  float seed = aParams.w;
  float activity = aParams.z;
  vec3 p = position;
  // Internal motion: small, seeded drift whose speed follows activity.
  float speed = 0.6 + activity * 2.2;
  float amp = 0.006 + activity * 0.022;
  p += uDrift * amp * vec3(
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
  vec4 clip = projectionMatrix * mv;
  // The cuts live on the page, so the parting happens on screen, after projection.
  vec2 px = vec2(clip.x / clip.w * 0.5 + 0.5, 0.5 - clip.y / clip.w * 0.5) * uViewport;
  vec2 shift = partForCuts(px);
  clip.xy += vec2(shift.x, -shift.y) / uViewport * 2.0 * clip.w;
  gl_Position = clip;
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
