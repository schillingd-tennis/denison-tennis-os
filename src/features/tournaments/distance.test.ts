import assert from "node:assert/strict";
import test from "node:test";
import { distanceMilesBetween, TOURNAMENT_DISTANCE_ORIGIN } from "./distance";

test("uses the requested Columbus address as the tournament distance origin", () => {
  assert.equal(TOURNAMENT_DISTANCE_ORIGIN, "4885 Shackelford Ct, Columbus, OH 43220");
});
test("calculates great-circle distance in miles", () => {
  assert.ok(Math.abs(distanceMilesBetween({ latitude: 40, longitude: -83 }, { latitude: 41, longitude: -83 }) - 69.1) < 0.5);
});
