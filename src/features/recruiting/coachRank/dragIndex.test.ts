import assert from "node:assert/strict";
import { test } from "node:test";

import {
  RANKED_DROP_HYSTERESIS_PX,
  RANKED_ROW_HEIGHT,
  boardDropZone,
  rankedDropIndex,
  rankedInsertIndex,
  rankedDropSlotTop,
  rankedInsertShiftY,
  rankedRemoveShiftY,
  rankedRowShiftY,
} from "./dragIndex";

const H = RANKED_ROW_HEIGHT;
const TOP = 100;

test("full row band is the drop target", () => {
  assert.equal(rankedDropIndex(TOP + 1, TOP, H, 10, 0, 0), 0);
  assert.equal(rankedDropIndex(TOP + H - 1, TOP, H, 10, 0, 0), 0);
  assert.equal(rankedDropIndex(TOP + H, TOP, H, 10, 0, 0), 1);
  assert.equal(rankedDropIndex(TOP + 3 * H + 20, TOP, H, 10, 3, 0), 3);
});

test("adjacent move requires hysteresis into the next band", () => {
  const yJustIntoRow3 = TOP + 3 * H + 1;
  assert.equal(rankedDropIndex(yJustIntoRow3, TOP, H, 10, 2), 2);
  const yPastHysteresis = TOP + 3 * H + RANKED_DROP_HYSTERESIS_PX;
  assert.equal(rankedDropIndex(yPastHysteresis, TOP, H, 10, 2), 3);
});

test("fast skip of several rows applies immediately", () => {
  assert.equal(rankedDropIndex(TOP + 2 * H + 10, TOP, H, 13, 9), 2);
  assert.equal(rankedDropIndex(TOP + 9 * H + 10, TOP, H, 13, 1), 9);
});

test("clamps to first and last rows", () => {
  assert.equal(rankedDropIndex(TOP - 40, TOP, H, 13, 5), 0);
  assert.equal(rankedDropIndex(TOP + 40 * H, TOP, H, 13, 5), 12);
});

test("horizontal-equivalent: only Y is used so X cannot change the index", () => {
  const a = rankedDropIndex(TOP + 4 * H + 20, TOP, H, 10, 4, 0);
  const b = rankedDropIndex(TOP + 4 * H + 20, TOP, H, 10, 4, 0);
  assert.equal(a, b);
  assert.equal(a, 4);
});

test("dragging down shifts intervening rows up to open a gap", () => {
  assert.equal(rankedRowShiftY(0, 1, 4, H), 0);
  assert.equal(rankedRowShiftY(2, 1, 4, H), -H);
  assert.equal(rankedRowShiftY(4, 1, 4, H), -H);
  assert.equal(rankedRowShiftY(5, 1, 4, H), 0);
});

test("dragging up shifts intervening rows down to open a gap", () => {
  assert.equal(rankedRowShiftY(0, 4, 1, H), 0);
  assert.equal(rankedRowShiftY(1, 4, 1, H), H);
  assert.equal(rankedRowShiftY(3, 4, 1, H), H);
  assert.equal(rankedRowShiftY(5, 4, 1, H), 0);
});

test("insert index allows append after the last ranked row", () => {
  assert.equal(rankedInsertIndex(TOP + 1, TOP, H, 3, 0, 0), 0);
  assert.equal(rankedInsertIndex(TOP + H + 1, TOP, H, 3, 1, 0), 1);
  assert.equal(rankedInsertIndex(TOP + 3 * H + 1, TOP, H, 3, 2, 0), 3);
  assert.equal(rankedInsertIndex(TOP, TOP, H, 0, 0, 0), 0);
});

test("insert shifts open a gap at the proposed rank", () => {
  assert.equal(rankedInsertShiftY(0, 1, H), 0);
  assert.equal(rankedInsertShiftY(1, 1, H), H);
  assert.equal(rankedInsertShiftY(2, 1, H), H);
});

test("remove shifts close the hole below the dragged ranked row", () => {
  assert.equal(rankedRemoveShiftY(0, 1, H), 0);
  assert.equal(rankedRemoveShiftY(1, 1, H), 0);
  assert.equal(rankedRemoveShiftY(2, 1, H), -H);
});

test("board drop zone uses the gap midpoint with hysteresis", () => {
  assert.equal(boardDropZone(140, 200, 220, "ranked", 12), "ranked");
  assert.equal(boardDropZone(230, 200, 220, "ranked", 12), "unranked");
  assert.equal(boardDropZone(180, 200, 220, "unranked", 12), "ranked");
});

test("board drop zone treats each section box as a generous target", () => {
  assert.equal(boardDropZone(200, 200, 220, "unranked", 12), "ranked");
  assert.equal(boardDropZone(220, 200, 220, "ranked", 12), "unranked");
  assert.equal(boardDropZone(199, 200, 220, "unranked", 12), "ranked");
  assert.equal(boardDropZone(221, 200, 220, "ranked", 12), "unranked");
});

test("drop slot top is a full-row band at the proposed index", () => {
  assert.equal(rankedDropSlotTop(0, H), 0);
  assert.equal(rankedDropSlotTop(5, H), 5 * H);
  assert.equal(rankedDropSlotTop(3, 0), 3 * H);
});
