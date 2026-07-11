import { describe, expect, it, vi } from "vitest";
import {
  CARDIO_ITEMS,
  STRENGTH_PARTS,
  buildDefaultWorkoutPayload,
  buildWorkoutEntries,
  buildWorkoutSummary,
  createWorkoutForPunch,
  mapWorkoutRecordToTicketPayload,
  parseWorkoutTicketPayload,
  replaceWorkoutForPunch,
} from "@/lib/workouts";

describe("workout helpers", () => {
  it("keeps visible strength and cardio catalogs aligned with the ticket", () => {
    expect(STRENGTH_PARTS).not.toContain("glutes");
    expect(CARDIO_ITEMS).toContain("dance");

    expect(buildWorkoutEntries({
      trainingType: "strength",
      cardioItem: null,
      strengthParts: ["legs"],
      durationMinutes: 40,
    })).toEqual([
      { category: "strength", code: "legs", label: "臀腿" },
    ]);
  });

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

  it("accepts multiple cardio items and stores one entry per item", () => {
    const parsed = parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: null,
      cardioItems: ["dance", "treadmill", "dance"],
      strengthParts: [],
      durationMinutes: 60,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(parsed.payload.cardioItem).toBe("treadmill");
    expect(parsed.payload.cardioItems).toEqual(["treadmill", "dance"]);
    expect(buildWorkoutEntries(parsed.payload)).toEqual([
      { category: "cardio", code: "treadmill", label: "跑步机" },
      { category: "cardio", code: "dance", label: "跳舞" },
    ]);
    expect(buildWorkoutSummary(parsed.payload)).toBe("跑步机 / 跳舞 · 60 分钟");
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
      cardioItem: "rowing",
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

  it("accepts walking and bike as cardio workouts", () => {
    const parsed = parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "walk",
      strengthParts: [],
      durationMinutes: 60,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(buildWorkoutEntries(parsed.payload)).toEqual([
      { category: "cardio", code: "walk", label: "散步" },
    ]);
    expect(buildWorkoutSummary(parsed.payload)).toBe("散步 · 60 分钟");
    const bike = parseWorkoutTicketPayload({
      trainingType: "cardio",
      cardioItem: "bike",
      strengthParts: [],
      durationMinutes: 60,
    });
    expect(bike.ok).toBe(true);
    if (!bike.ok) throw new Error(bike.error);
    expect(buildWorkoutEntries(bike.payload)).toEqual([
      { category: "cardio", code: "bike", label: "动感单车" },
    ]);
  });

  it("accepts the 45 minute duration used by beginner plan templates", () => {
    const parsed = parseWorkoutTicketPayload({
      trainingType: "strength",
      cardioItem: null,
      cardioItems: [],
      strengthParts: ["chest", "back"],
      durationMinutes: 45,
    });

    expect(parsed.ok).toBe(true);
  });

  it("accepts arms as a strength workout part", () => {
    const parsed = parseWorkoutTicketPayload({
      trainingType: "strength",
      cardioItem: null,
      strengthParts: ["arms"],
      durationMinutes: 40,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(buildWorkoutEntries(parsed.payload)).toEqual([
      { category: "strength", code: "arms", label: "手臂" },
    ]);
    expect(buildWorkoutSummary(parsed.payload)).toBe("手臂 · 40 分钟");
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
        cardioItems: ["treadmill"],
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
        cardioItems: ["treadmill"],
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
      cardioItems: [],
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
      cardioItems: ["treadmill"],
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

  it("maps a stored workout record back to a ticket payload", () => {
    const payload = mapWorkoutRecordToTicketPayload({
      trainingType: "both",
      durationMinutes: 70,
      entries: [
        { category: "strength", code: "abs", label: "腹" },
        { category: "cardio", code: "swim", label: "游泳" },
        { category: "strength", code: "chest", label: "胸" },
      ],
    });

    expect(payload).toEqual({
      trainingType: "both",
      cardioItem: "swim",
      cardioItems: ["swim"],
      strengthParts: ["chest", "abs"],
      durationMinutes: 70,
    });
  });

  it("uses a 60 minute UI default when stored duration is unknown", () => {
    const payload = mapWorkoutRecordToTicketPayload({
      trainingType: "cardio",
      durationMinutes: null,
      entries: [
        { category: "cardio", code: "treadmill", label: "跑步机" },
      ],
    });

    expect(payload).toEqual({
      trainingType: "cardio",
      cardioItem: "treadmill",
      cardioItems: ["treadmill"],
      strengthParts: [],
      durationMinutes: 60,
    });
  });

  it("returns null when stored workout entries cannot form a valid ticket payload", () => {
    expect(mapWorkoutRecordToTicketPayload({
      trainingType: "both",
      durationMinutes: 60,
      entries: [
        { category: "strength", code: "abs", label: "腹" },
      ],
    })).toBeNull();
  });

  it("replaces an existing workout by punch id", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "workout-1", entries: [] });

    await replaceWorkoutForPunch({
      tx: { workoutRecord: { upsert } } as never,
      userId: "user-1",
      teamId: "team-1",
      punchRecordId: "punch-1",
      dayKey: "2026-06-12",
      payload: {
        trainingType: "strength",
        cardioItem: null,
        strengthParts: ["chest", "shoulder"],
        durationMinutes: 50,
      },
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { punchRecordId: "punch-1" },
      create: {
        userId: "user-1",
        teamId: "team-1",
        punchRecordId: "punch-1",
        dayKey: "2026-06-12",
        trainingType: "strength",
        durationMinutes: 50,
        entries: {
          create: [
            { category: "strength", code: "chest", label: "胸" },
            { category: "strength", code: "shoulder", label: "肩" },
          ],
        },
      },
      update: {
        trainingType: "strength",
        durationMinutes: 50,
        entries: {
          deleteMany: {},
          create: [
            { category: "strength", code: "chest", label: "胸" },
            { category: "strength", code: "shoulder", label: "肩" },
          ],
        },
      },
      include: { entries: true },
    });
  });
});
