precision highp float;

// Reads each particle's live position from the simulation texture and projects
// it to clip space (same pixel→clip math as the lab's vertex shader). `ref` is
// the particle's texel coordinate in the sim/color textures.
uniform sampler2D uPosition;
uniform sampler2D uColor;
uniform vec2 u_resolution;
uniform vec2 u_scale;
uniform float u_pointSize;
uniform float uProgress; // intro: 1 = at the logo (normal), 0 = fully scattered

attribute vec2 ref;
attribute vec2 aScatter; // per-particle intro scatter offset (px)

varying vec4 v_color;

void main() {
  vec2 simPos = texture2D(uPosition, ref).xy; // live sim position (pixels)
  v_color = texture2D(uColor, ref);

  // Intro: additive scatter offset that fades to zero as uProgress→1. At 1 this is
  // exactly simPos, so the logo + mouse physics are byte-identical to before.
  vec2 a_position = simPos + aScatter * (1.0 - uProgress);

  vec2 center = u_resolution * 0.5;
  vec2 p = (a_position - center) * u_scale + center;

  vec2 zeroToOne = p / u_resolution;
  vec2 clipSpace = zeroToOne * 2.0 - 1.0;

  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  gl_PointSize = u_pointSize;
}
