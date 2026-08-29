export function fitWorldTransform(points, width, height, pad = 24) {
  if (!points.length) throw new Error("at least one world point is required");
  const xs = points.map((p) => p.x), zs = points.map((p) => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const scale = Math.min((width - 2 * pad) / Math.max(maxX - minX, 1), (height - 2 * pad) / Math.max(maxZ - minZ, 1));
  return {
    scale,
    offsetX: (width - (maxX - minX) * scale) / 2 - minX * scale,
    offsetY: (height - (maxZ - minZ) * scale) / 2 + maxZ * scale,
    worldToScreen({ x, z }) { return { x: this.offsetX + x * this.scale, y: this.offsetY - z * this.scale }; },
  };
}

export function screenToWorld({ x, y }, transform) {
  return { x: (x - transform.offsetX) / transform.scale, z: (transform.offsetY - y) / transform.scale };
}

export function createCoursePlan({ course_id, course }) {
  return { course_id, course, shortcuts: [] };
}

export function createShortcut(name) {
  return { name, points: [] };
}

export function createPoint(role, position) {
  return { role, position: { ...position }, constraints: [] };
}

export function addConstraint(point, key, state, durationFrames) {
  if (!["pressed", "released"].includes(state)) throw new Error("state must be pressed or released");
  if (!Number.isInteger(durationFrames) || durationFrames < 1) throw new Error("duration_frames must be a positive integer");
  point.constraints.push({ key, state, duration_frames: durationFrames });
  return point;
}
