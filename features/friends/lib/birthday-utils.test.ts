import { describe, expect, it } from "vitest";
import {
  calculateAge,
  getBirthdaysForDate,
  formatBirthdayMessage,
  formatBirthdayBannerMessage,
} from "./birthday-utils";
import type { Friend } from "./friend";

describe("birthday-utils", () => {
  const friends: Friend[] = [
    { name: "Alice", birthday: "2005-05-10" },
    { name: "Bob", birthday: "2004-05-10" },
    { name: "Charlie", birthday: "2003-08-20" },
    { name: "David", birthday: undefined },
  ];

  describe("getBirthdaysForDate", () => {
    it("returns friends born on the specified month-day", () => {
      const match = getBirthdaysForDate("2026-05-10", friends);
      expect(match.map((f) => f.name)).toEqual(["Alice", "Bob"]);
    });

    it("returns empty array when no birthdays match", () => {
      const match = getBirthdaysForDate("2026-05-11", friends);
      expect(match).toEqual([]);
    });

    it("handles invalid date strings gracefully", () => {
      expect(getBirthdaysForDate("invalid", friends)).toEqual([]);
    });
  });

  describe("calculateAge", () => {
    it("calculates age accurately on birthday", () => {
      expect(calculateAge("2005-05-10", "2026-05-10")).toBe(21);
    });

    it("calculates age before birthday in target year", () => {
      expect(calculateAge("2005-05-10", "2026-05-09")).toBe(20);
    });

    it("calculates age after birthday in target year", () => {
      expect(calculateAge("2005-05-10", "2026-05-11")).toBe(21);
    });
  });

  describe("formatBirthdayMessage", () => {
    it("returns empty string when no birthdays are provided", () => {
      expect(formatBirthdayMessage("2026-05-10", [])).toBe("");
    });

    it("uses past tense ('turned') for birthdays that already happened", () => {
      const single = [{ name: "Alice", birthday: "2005-05-10" }];
      const message = formatBirthdayMessage("2026-05-10", single, "2026-05-15");
      expect(message).toBe("On May 10th, Alice turned 21!");

      const multiple = [
        { name: "Alice", birthday: "2005-05-10" },
        { name: "Bob", birthday: "2004-05-10" },
      ];
      const multiMessage = formatBirthdayMessage("2026-05-10", multiple, "2026-05-15");
      expect(multiMessage).toBe("On May 10th, Alice turned 21 and Bob turned 22!");
    });

    it("uses today tense ('turns') for birthdays happening today", () => {
      const single = [{ name: "Alice", birthday: "2005-05-10" }];
      const message = formatBirthdayMessage("2026-05-10", single, "2026-05-10");
      expect(message).toBe("Today, Alice turns 21!");

      const multiple = [
        { name: "Alice", birthday: "2005-05-10" },
        { name: "Bob", birthday: "2004-05-10" },
      ];
      const multiMessage = formatBirthdayMessage("2026-05-10", multiple, "2026-05-10");
      expect(multiMessage).toBe("Today, Alice turns 21 and Bob turn 22!");
    });

    it("uses future tense ('is turning') for upcoming birthdays", () => {
      const single = [{ name: "Alice", birthday: "2005-05-10" }];
      const message = formatBirthdayMessage("2026-05-10", single, "2026-05-01");
      expect(message).toBe("On May 10th, Alice is turning 21!");

      const multiple = [
        { name: "Alice", birthday: "2005-05-10" },
        { name: "Bob", birthday: "2004-05-10" },
      ];
      const multiMessage = formatBirthdayMessage("2026-05-10", multiple, "2026-05-01");
      expect(multiMessage).toBe("On May 10th, Alice is turning 21 and Bob is turning 22!");
    });
  });

  describe("formatBirthdayBannerMessage", () => {
    it("formats banner message for single friend", () => {
      const single = [{ name: "Alice", birthday: "2005-05-10" }];
      expect(formatBirthdayBannerMessage("2026-05-10", single)).toBe(
        "Hey, it's Alice's 21st birthday!",
      );
    });

    it("formats banner message for multiple friends", () => {
      const multiple = [
        { name: "Alice", birthday: "2005-05-10" },
        { name: "Bob", birthday: "2004-05-10" },
      ];
      expect(formatBirthdayBannerMessage("2026-05-10", multiple)).toBe(
        "Hey, it's Alice's 21st and Bob's 22nd birthdays!",
      );
    });
  });
});
