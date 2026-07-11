import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("training plan prisma schema", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  it("defines the training profile and immutable plan snapshot models", () => {
    expect(schema).toContain("model TrainingProfile {");
    expect(schema).toContain("model TrainingPlan {");
    expect(schema).toContain("model TrainingPlanDay {");
    expect(schema).toContain("model TrainingPlanExercise {");
  });

  it("links a plan day to at most one existing workout record", () => {
    expect(schema).toMatch(/workoutRecordId\s+String\?\s+@unique/);
    expect(schema).toMatch(
      /workoutRecord\s+WorkoutRecord\?\s+@relation\(fields: \[workoutRecordId\], references: \[id\], onDelete: SetNull\)/,
    );
  });
});
