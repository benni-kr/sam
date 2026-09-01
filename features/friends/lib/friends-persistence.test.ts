import { describe, expect, it } from "vitest";
import {
  rowToFriend,
  friendToRow,
  dedupeFriends,
  rowsToFriends,
  normalizeBirthday,
  type SupabaseFriendRow,
} from "./friends-persistence";
import type { Friend } from "./friend";

describe("Friends Persistence Data Integrity", () => {
  it("converts a Supabase friend row to Friend model", () => {
    const row: SupabaseFriendRow = {
      planner_scope: "test-scope",
      friend_name: "Malte",
      birthday: "1998-05-12",
    };

    const friend = rowToFriend(row);
    expect(friend).toEqual({
      name: "Malte",
      birthday: "1998-05-12",
    });
  });

  it("converts a Friend to Supabase row model", () => {
    const friend: Friend = {
      name: "Benjamin",
      birthday: "1999-11-23",
    };

    const row = friendToRow(friend, "test-scope");
    expect(row).toEqual({
      planner_scope: "test-scope",
      friend_name: "Benjamin",
      birthday: "1999-11-23",
    });
  });

  it("deduplicates friends case-insensitively and trims names", () => {
    const rawFriends: Friend[] = [
      { name: "  Alice  ", birthday: "2000-01-01" },
      { name: "alice", birthday: "2000-01-02" },
      { name: "Bob", birthday: undefined },
      { name: "   ", birthday: undefined },
    ];

    const deduped = dedupeFriends(rawFriends);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].name).toBe("Alice");
    expect(deduped[1].name).toBe("Bob");
  });

  it("normalizes birthdays to YYYY-MM-DD format or undefined", () => {
    expect(normalizeBirthday("2000-12-31")).toBe("2000-12-31");
    expect(normalizeBirthday("invalid-date")).toBeUndefined();
    expect(normalizeBirthday("")).toBeUndefined();
    expect(normalizeBirthday(undefined)).toBeUndefined();
  });

  it("deserializes multiple rows into a sorted list of friends", () => {
    const rows: SupabaseFriendRow[] = [
      { planner_scope: "s", friend_name: "Zara", birthday: null },
      { planner_scope: "s", friend_name: "Alex", birthday: "2001-04-10" },
    ];

    const result = rowsToFriends(rows);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alex");
    expect(result[1].name).toBe("Zara");
  });
});
