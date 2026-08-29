import test from "node:test";
import assert from "node:assert/strict";
import { fitWorldTransform, screenToWorld, createCoursePlan, createShortcut, createPoint, addConstraint } from "../labeler-core.js";

test("screen conversion round-trips an XZ coordinate", () => {
  const transform = fitWorldTransform([{x: -100, z: -50}, {x: 300, z: 150}], 1000, 500, 20);
  const screen = transform.worldToScreen({x: 80, z: 25});
  const world = screenToWorld(screen, transform);
  assert.ok(Math.abs(world.x - 80) < 1e-9);
  assert.ok(Math.abs(world.z - 25) < 1e-9);
});

test("shortcut point can force a key pressed for an exact frame duration", () => {
  const point = createPoint("mid", {x: 10, z: 20});
  addConstraint(point, "A", "pressed", 18);
  assert.deepEqual(point, {role: "mid", position: {x: 10, z: 20}, constraints: [{key: "A", state: "pressed", duration_frames: 18}]});
});

test("shortcut point can force a key released for an exact frame duration", () => {
  const point = createPoint("start", {x: 3, z: 4});
  addConstraint(point, "L", "released", 5);
  assert.deepEqual(point.constraints, [{key: "L", state: "released", duration_frames: 5}]);
});

test("multiple named shortcuts remain independent", () => {
  const one = createShortcut("first cut"), two = createShortcut("second cut");
  one.points.push(createPoint("start", {x: 1, z: 2}));
  assert.equal(one.name, "first cut"); assert.equal(two.name, "second cut"); assert.equal(two.points.length, 0);
});

test("course plans keep shortcut labels isolated per map", () => {
  const dk = createCoursePlan({course_id: "boardcross_course", course: "DK Summit"});
  const luigi = createCoursePlan({course_id: "beginner_course", course: "Luigi Circuit"});
  dk.shortcuts.push(createShortcut("DK cut 1"));
  assert.equal(dk.course_id, "boardcross_course");
  assert.equal(luigi.shortcuts.length, 0);
});
