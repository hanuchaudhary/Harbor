import assert from "node:assert/strict";
import test from "node:test";

import {
  canViewPlatformAnalytics,
  completionRate,
  parseAnalyticsRange,
  percentageChange,
} from "./utils";

test("analytics access is limited to admins and project managers", () => {
  assert.equal(canViewPlatformAnalytics("ADMIN"), true);
  assert.equal(canViewPlatformAnalytics("PROJECT_MANAGER"), true);
  assert.equal(canViewPlatformAnalytics("DEVELOPER"), false);
  assert.equal(canViewPlatformAnalytics(undefined), false);
});

test("analytics ranges default to 30 days and reject unsupported values", () => {
  assert.equal(parseAnalyticsRange(null), 30);
  assert.equal(parseAnalyticsRange("7"), 7);
  assert.equal(parseAnalyticsRange("90"), 90);
  assert.equal(parseAnalyticsRange("14"), null);
  assert.equal(parseAnalyticsRange("not-a-number"), null);
});

test("aggregate comparisons handle empty and populated periods", () => {
  assert.equal(completionRate(0, 0), 0);
  assert.equal(completionRate(8, 10), 80);
  assert.equal(percentageChange(12, 0), null);
  assert.equal(percentageChange(12, 8), 50);
  assert.equal(percentageChange(5, 10), -50);
});
