import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatOgDescription,
  OG_IMAGE_PATH,
  fetchEventForOg,
  getRequestOrigin,
  type OgEventData,
} from "./event-og-helper";

describe("event-og-helper", () => {
  describe("formatOgDescription", () => {
    it("formats calendar events with date, time, and category", () => {
      const event: OgEventData = {
        id: "evt-1",
        title: "Pizza Night",
        category: "Food",
        startDate: "2026-10-24",
        startTime: "19:00",
        endTime: "21:30",
        participants: ["Alice", "Bob", "Charlie"],
      };

      const description = formatOgDescription(event);
      expect(description).toBe("24.10.2026 · 19:00 – 21:30 · Food");
    });

    it("formats calendar events with date range", () => {
      const event: OgEventData = {
        id: "evt-2",
        title: "Camping Trip",
        category: "Excursion",
        startDate: "2026-08-10",
        endDate: "2026-08-12",
        participants: ["Alice"],
      };

      const description = formatOgDescription(event);
      expect(description).toBe("10.08.2026 – 12.08.2026 · Excursion");
    });

    it("formats weekly schedule routine appointments", () => {
      const event: OgEventData = {
        id: "week-1",
        title: "Algorithms Lecture",
        category: "University",
        day: "Fri",
        startTime: "10:00",
        endTime: "11:30",
      };

      const description = formatOgDescription(event);
      expect(description).toBe("Every Friday · 10:00 – 11:30 · University");
    });
  });

  describe("OG_IMAGE_PATH", () => {
    it("points to the official SAM compact icon (<300px for WhatsApp compact preview)", () => {
      expect(OG_IMAGE_PATH).toBe("/icons/og-thumb.png");
    });
  });

  describe("getRequestOrigin", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    it("falls back to localhost when no environment variables or headers are set", async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.VERCEL_URL;
      const origin = await getRequestOrigin();
      expect(origin).toBe("http://localhost:3000");
    });

    it("uses NEXT_PUBLIC_APP_URL when configured", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://custom.sam.dev/";
      const origin = await getRequestOrigin();
      expect(origin).toBe("https://custom.sam.dev");
    });
  });

  describe("fetchEventForOg", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    it("returns null when Supabase environment variables are missing", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const result = await fetchEventForOg("evt-1");
      expect(result).toBeNull();
    });

    it("fetches a calendar event from Supabase when configured", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-key";

      const mockRow = {
        event_id: "evt-123",
        title: "Birthday Party",
        category: "Party",
        start_date: "2026-05-20",
        end_date: null,
        start_time: "20:00",
        end_time: null,
        participants: ["Dave", "Eve"],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [mockRow],
      });
      global.fetch = mockFetch;

      const result = await fetchEventForOg("evt-123");
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Birthday Party");
      expect(result?.category).toBe("Party");
      expect(result?.startDate).toBe("2026-05-20");
      expect(result?.participants).toEqual(["Dave", "Eve"]);
    });
  });
});
