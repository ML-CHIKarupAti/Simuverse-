// Trail ring buffer — PLAN §8 2.6. Pure, allocation-free helpers so the
// "memory stable over 10 min" guarantee is unit-tested. The buffer is a fixed
// Float32Array of `cap` points; once full it drops the oldest and appends the
// newest in place (copyWithin — no allocation, no growth).

// Append (x,y,z) to a fixed-capacity position buffer. Returns the new point
// count. Mutates `positions` in place; never allocates.
export function appendTrailPoint(
  positions: Float32Array,
  count: number,
  cap: number,
  x: number,
  y: number,
  z: number,
): number {
  if (count < cap) {
    positions[3 * count] = x
    positions[3 * count + 1] = y
    positions[3 * count + 2] = z
    return count + 1
  }
  positions.copyWithin(0, 3, cap * 3) // shift every point back one slot (drop oldest)
  const last = (cap - 1) * 3
  positions[last] = x
  positions[last + 1] = y
  positions[last + 2] = z
  return cap
}

// Fill per-vertex colours with a head-to-tail fade: oldest point (index 0) is
// dim, newest (index count-1) is full colour. With additive blending the dim
// tail adds ~nothing (fades to invisible) and the head glows.
export function fillTrailFade(
  colors: Float32Array,
  count: number,
  r: number,
  g: number,
  b: number,
): void {
  for (let i = 0; i < count; i++) {
    const f = (i + 1) / count
    colors[3 * i] = r * f
    colors[3 * i + 1] = g * f
    colors[3 * i + 2] = b * f
  }
}
