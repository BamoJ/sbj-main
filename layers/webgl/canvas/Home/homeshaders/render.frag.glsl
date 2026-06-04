precision highp float;

// Soft circular point — ported 1:1 from the lab's fragment shader.
varying vec4 v_color;

void main() {
  if(v_color.a < 0.01)
    discard;
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  float alpha = 0.13 - smoothstep(0.0, 0.5, dist);
  gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}
