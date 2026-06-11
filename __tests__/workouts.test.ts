import { describe, expect, it, vi } from "vitest";
import {
  buildDefaultWorkoutPayload,
  buildWorkoutEntries,
  buildWorkoutSummary,
  createWorkoutForPunch,
  parseWorkoutTicketPayload,
} from "@/lib/workouts";

describe("workout helpers", () => {
  it("builds cardio and strength entries from a mixed workout ticket", () => {
    const parsed = parseWorkoutTicketPayload({
      trainingType: "both",
      cardioItem: "elliptical",
      strengthParts: ["chest", "abs"],
      durationMinutes: 60,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(buildWorkoutEntries(parsed.payload)).toEqual([
      { category: "cardio", code: "elliptical", label: "椭圆机" },
      { category: "strength", code: "chest", label: "胸" },
      { category: "strength", code: "abs", label: "腹" },
    ]);
    expect(buildWorkoutSummary(parsed.payload)).toBe("椭圆机 + 胸 / 腹 · 60 分钟");
  });

  it("rejects strength workouts without a strength part", () => {
    const parsed = parseWorkoutTicketPayload({
      trainingType: "strength",
      cardioItem: null,
      strengthParts: [],
      durationMinutes: 60,
    });

    expect(parsed).toEqual({
      ok: false,
      error: "invalid-workout-payload",
    });
  });

  it("rejects durations outside the supported 10 minute steps", () => {
    expect(parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: 65,
    })).toEqual({ ok: false, error: "invalid-workout-payload" });

    expect(parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: 190,
    })).toEqual({ ok: false, error: "invalid-workout-payload" });
  });

  it("rejects malformed request-body workout payloads", () => {
    expect(parseWorkoutTicketPayload({
      trainingType: "both",
      cardioItem: null,
      strengthParts: ["chest"],
      durationMinutes: 60,
    })).toEqual({ ok: false, error: "invalid-workout-payload" });

    expect(parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "bike",
      strengthParts: [],
      durationMinutes: 60,
    })).toEqual({ ok: false, error: "invalid-workout-payload" });

    expect(parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "treadmill",
      durationMinutes: 60,
    })).toEqual({ ok: false, error: "invalid-workout-payload" });

    expect(parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: "60",
    })).toEqual({ ok: false, error: "invalid-workout-payload" });
  });

  it("accepts supported duration boundaries for cardio workouts", () => {
    expect(parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: 10,
    })).toEqual({
      ok: true,
      payload: {
        trainingType: "cardio",
        cardioItem: "treadmill",
        strengthParts: [],
        durationMinutes: 10,
      },
    });

    expect(parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: 180,
    })).toEqual({
      ok: true,
      payload: {
        trainingType: "cardio",
        cardioItem: "treadmill",
        strengthParts: [],
        durationMinutes: 180,
      },
    });
  });

  it("deduplicates strength parts while preserving catalog order", () => {
    const parsed = parseWorkoutTicketPayload({
      trainingType: "strength",
      cardioItem: "treadmill",
      strengthParts: ["abs", "chest", "abs"],
      durationMinutes: 40,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(parsed.payload).toEqual({
      trainingType: "strength",
      cardioItem: null,
      strengthParts: ["chest", "abs"],
      durationMinutes: 40,
    });
    expect(buildWorkoutEntries(parsed.payload)).toEqual([
      { category: "strength", code: "chest", label: "胸" },
      { category: "strength", code: "abs", label: "腹" },
    ]);
  });

  it("builds a default historical treadmill workout with unknown duration", () => {
    const payload = buildDefaultWorkoutPayload();

    expect(payload).toEqual({
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: null,
    });
    expect(buildWorkoutSummary(payload)).toBe("跑步机");
  });

  it("creates a workout record with nested entries for a valid payload", async () => {
    const create = vi.fn().mockResolvedValue({ id: "workout-1", entries: [] });

    await createWorkoutForPunch({
      tx: { workoutRecord: { create } } as never,
      userId: "user-1",
      teamId: "team-1",
      punchRecordId: "punch-1",
      dayKey: "2026-04-24",
      payload: {
        trainingType: "both",
        cardioItem: "elliptical",
        strengthParts: ["chest", "abs"],
        durationMinutes: 60,
      },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        teamId: "team-1",
        punchRecordId: "punch-1",
        dayKey: "2026-04-24",
        trainingType: "both",
        durationMinutes: 60,
        entries: {
          create: [
            { category: "cardio", code: "elliptical", label: "椭圆机" },
            { category: "strength", code: "chest", label: "胸" },
            { category: "strength", code: "abs", label: "腹" },
          ],
        },
      },
      include: { entries: true },
    });
  });

  it("rejects invalid create payloads before calling Prisma", async () => {
    const create = vi.fn();

    await expect(createWorkoutForPunch({
      tx: { workoutRecord: { create } } as never,
      userId: "user-1",
      teamId: "team-1",
      punchRecordId: "punch-1",
      dayKey: "2026-04-24",
      payload: {
        trainingType: "both",
        cardioItem: null,
        strengthParts: [],
        durationMinutes: 60,
      },
    })).rejects.toThrow("invalid-workout-payload");

    await expect(createWorkoutForPunch({
      tx: { workoutRecord: { create } } as never,
      userId: "user-1",
      teamId: "team-1",
      punchRecordId: "punch-1",
      dayKey: "2026-04-24",
      payload: {
        trainingType: "strength",
        cardioItem: null,
        strengthParts: ["abs", "chest"],
        durationMinutes: 60,
      },
    })).rejects.toThrow("invalid-workout-payload");

    expect(create).not.toHaveBeenCalled();
  });
});
