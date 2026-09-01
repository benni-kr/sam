"use client";

/**
 * Friends State
 *
 * This module coordinates friend hydration, persistence, and mutation events
 * for the planner participant list.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import { SEMESTER_FRIENDS } from "@/features/planner/lib/planner";
import {
  getDefaultFriends,
  loadFriends,
  insertFriend,
  updateFriendInStore,
  deleteFriendFromStore,
  rowToFriend,
  type SupabaseFriendRow,
} from "@/features/friends/lib/friends-persistence";
import type { Friend } from "@/features/friends/lib/friend";
import {
  isOfflineError,
  readSnapshot,
  writeSnapshot,
} from "@/features/planner/lib/offline-cache";
import {
  getSupabaseBrowserClient,
  getSupabaseConfig,
} from "@/lib/supabase/client";

/** Offline snapshot key; namespaced per planner scope by the cache module. */
const FRIENDS_SNAPSHOT_KEY = "friends";

/**
 * A discrete description of the most recent friend mutation.
 *
 * This value is exposed in the friends state so other bounded contexts
 * (for example, the Planner domain) can observe and react to changes
 * without creating tight coupling. Consumers can listen for mutations
 * (like `remove`) to perform cascading updates such as removing a
 * deleted friend from all events.
 */
type FriendMutation =
  | { type: "add"; name: string }
  | { type: "rename"; currentName: string; nextName: string }
  | { type: "remove"; name: string }
  | null;

type FriendsStateContextValue = {
  friends: Friend[];
  friendNames: string[];
  isHydrated: boolean;
  isOffline: boolean;
  addFriend: (name: string, birthday?: string) => void;
  updateFriend: (
    currentName: string,
    input: { name: string; birthday?: string },
  ) => void;
  renameFriend: (currentName: string, nextName: string) => void;
  removeFriend: (name: string) => void;
  lastMutation: FriendMutation;
};

type FriendsProviderProps = {
  children: ReactNode;
};

type FriendState = {
  friends: Friend[];
  lastMutation: FriendMutation;
};

type FriendAction =
  | { type: "hydrate"; friends: Friend[] }
  | { type: "addFriend"; name: string; birthday?: string }
  | {
      type: "updateFriend";
      currentName: string;
      nextName: string;
      birthday?: string;
    }
  | { type: "removeFriend"; name: string }
  | { type: "remoteUpsertFriend"; friend: Friend }
  | { type: "remoteDeleteFriend"; name: string };

const FriendsStateContext = createContext<FriendsStateContextValue | null>(
  null,
);

function normalizeFriendName(name: string) {
  return name.trim();
}

function normalizeBirthday(birthday: string | undefined) {
  if (!birthday) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? birthday : undefined;
}

function dedupeFriends(friends: Friend[]) {
  const uniqueByLowerCase = new Map<string, Friend>();

  for (const friend of friends) {
    const normalizedName = normalizeFriendName(friend.name);

    if (!normalizedName) {
      continue;
    }

    // Use the lower-cased string as the Map key to enforce case-insensitive
    // uniqueness. This ensures "Alex" and "alex" are treated as the same
    // participant rather than two separate entries.
    const key = normalizedName.toLocaleLowerCase();

    if (!uniqueByLowerCase.has(key)) {
      uniqueByLowerCase.set(key, {
        name: normalizedName,
        birthday: normalizeBirthday(friend.birthday),
      });
    }
  }

  return Array.from(uniqueByLowerCase.values());
}

function normalizeHydratedFriends(
  friends: Friend[] | string[] | null | undefined,
) {
  if (!friends || friends.length === 0) {
    return dedupeFriends(
      SEMESTER_FRIENDS.map((name) => ({ name, birthday: undefined })),
    );
  }

  const normalizedFriends = friends.map((friend) =>
    typeof friend === "string" ? { name: friend } : friend,
  );

  return dedupeFriends(normalizedFriends);
}

function findFriendIndex(friends: Friend[], friendName: string) {
  const normalized = normalizeFriendName(friendName).toLocaleLowerCase();

  return friends.findIndex(
    (friend) => friend.name.toLocaleLowerCase() === normalized,
  );
}

function friendsReducer(state: FriendState, action: FriendAction): FriendState {
  switch (action.type) {
    case "hydrate": {
      return {
        friends: dedupeFriends(action.friends).sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
        lastMutation: null,
      };
    }

    case "addFriend": {
      // Enforce case-insensitive uniqueness and keep the list sorted for
      // predictable UI ordering. Names are normalized then compared lower-cased
      // to avoid duplicates like "Alex" vs "alex".
      const normalizedName = normalizeFriendName(action.name);

      if (!normalizedName) {
        return state;
      }

      if (findFriendIndex(state.friends, normalizedName) !== -1) {
        return state;
      }

      return {
        friends: [
          ...state.friends,
          {
            name: normalizedName,
            birthday: normalizeBirthday(action.birthday),
          },
        ].sort((left, right) => left.name.localeCompare(right.name)),
        lastMutation: { type: "add", name: normalizedName },
      };
    }

    case "updateFriend": {
      const normalizedCurrentName = normalizeFriendName(action.currentName);
      const normalizedNextName = normalizeFriendName(action.nextName);
      const normalizedBirthday = normalizeBirthday(action.birthday);
      const hasBirthdayInput = Object.prototype.hasOwnProperty.call(
        action,
        "birthday",
      );

      if (!normalizedCurrentName || !normalizedNextName) {
        return state;
      }

      const currentIndex = findFriendIndex(
        state.friends,
        normalizedCurrentName,
      );
      const targetIndex = findFriendIndex(state.friends, normalizedNextName);

      if (currentIndex === -1) {
        return state;
      }

      if (targetIndex !== -1 && targetIndex !== currentIndex) {
        return state;
      }

      const currentFriend = state.friends[currentIndex];
      const nextFriend = {
        name: normalizedNextName,
        birthday: hasBirthdayInput
          ? normalizedBirthday
          : currentFriend.birthday,
      };

      const hasNameChanged =
        currentFriend.name.toLocaleLowerCase() !==
        normalizedNextName.toLocaleLowerCase();
      const hasBirthdayChanged = currentFriend.birthday !== nextFriend.birthday;

      if (!hasNameChanged && !hasBirthdayChanged) {
        return state;
      }

      return {
        friends: state.friends
          .map((friend, index) =>
            index === currentIndex ? nextFriend : friend,
          )
          .sort((left, right) => left.name.localeCompare(right.name)),
        lastMutation: hasNameChanged
          ? {
              type: "rename",
              currentName: normalizedCurrentName,
              nextName: normalizedNextName,
            }
          : hasBirthdayChanged
            ? null
            : state.lastMutation,
      };
    }

    case "removeFriend": {
      const normalizedName = normalizeFriendName(action.name);

      if (!normalizedName) {
        return state;
      }

      const nextFriends = state.friends.filter(
        (friend) =>
          friend.name.toLocaleLowerCase() !==
          normalizedName.toLocaleLowerCase(),
      );

      if (nextFriends.length === state.friends.length) {
        return state;
      }

      return {
        friends: nextFriends,
        lastMutation: { type: "remove", name: normalizedName },
      };
    }

    case "remoteUpsertFriend": {
      const { friend } = action;
      const normalized = normalizeFriendName(friend.name);
      if (!normalized) {
        return state;
      }

      const existingIndex = findFriendIndex(state.friends, normalized);
      const updatedList =
        existingIndex !== -1
          ? state.friends.map((item, index) =>
              index === existingIndex ? { ...item, ...friend } : item,
            )
          : [...state.friends, friend];

      return {
        ...state,
        friends: dedupeFriends(updatedList).sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      };
    }

    case "remoteDeleteFriend": {
      const normalized = normalizeFriendName(action.name);
      if (!normalized) {
        return state;
      }

      return {
        ...state,
        friends: state.friends.filter(
          (friend) =>
            friend.name.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
        ),
      };
    }

    default:
      return state;
  }
}

/**
 * Provides the mutable friend list and its persistence lifecycle to consumers.
 */
export function FriendsProvider({ children }: FriendsProviderProps) {
  const [state, dispatch] = useReducer(friendsReducer, {
    friends: getDefaultFriends(),
    lastMutation: null,
  });
  const [persistenceError, setPersistenceError] = useState<Error | null>(null);
  // Gates *waiting*: the load attempt finished, successfully or not. The planner
  // blocks its own hydration on this, so it has to flip in the offline case too
  // — otherwise a failed friends load leaves the calendar permanently empty.
  const [hasSettled, setHasSettled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  if (persistenceError) {
    throw persistenceError;
  }

  useEffect(() => {
    let cancelled = false;

    // Two-argument then, deliberately not .then().catch(): a chained catch would
    // also swallow errors thrown by the success handler, and those would then be
    // misread as "offline" and silently swap live data for the snapshot.
    void loadFriends().then(
      (friendsFromStore) => {
        if (cancelled) {
          return;
        }

        if (!friendsFromStore) {
          setHasSettled(true);
          return;
        }

        const hydratedFriends = normalizeHydratedFriends(friendsFromStore).sort(
          (left, right) => left.name.localeCompare(right.name),
        );

        dispatch({ type: "hydrate", friends: hydratedFriends });
        writeSnapshot(FRIENDS_SNAPSHOT_KEY, hydratedFriends);

        setIsOffline(false);
        setHasSettled(true);
      },
      (error: unknown) => {
        if (cancelled) {
          return;
        }

        // Only an unreachable host means "offline". A rejected request still
        // surfaces as a real error.
        if (!isOfflineError(error)) {
          setPersistenceError(
            error instanceof Error
              ? error
              : new Error("Failed to hydrate planner friends from Supabase."),
          );
          return;
        }

        const cached = readSnapshot<Friend[]>(FRIENDS_SNAPSHOT_KEY);

        if (cached) {
          dispatch({ type: "hydrate", friends: cached.payload });
        }

        setIsOffline(true);
        setHasSettled(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to Realtime postgres_changes on planner_friends table
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    const config = getSupabaseConfig();

    if (!client || !config) {
      return;
    }

    const channel = client
      .channel(`realtime:friends:${config.plannerScope}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planner_friends",
          filter: `planner_scope=eq.${config.plannerScope}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as SupabaseFriendRow;
            if (row && row.friend_name) {
              const friend = rowToFriend(row);
              dispatch({ type: "remoteUpsertFriend", friend });
            }
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<SupabaseFriendRow>;
            if (oldRow && oldRow.friend_name) {
              dispatch({ type: "remoteDeleteFriend", name: oldRow.friend_name });
            }
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  const value = useMemo<FriendsStateContextValue>(() => {
    return {
      friends: state.friends,
      friendNames: state.friends.map((friend) => friend.name),
      // "The load finished", not "we have server data" — see hasSettled.
      isHydrated: hasSettled,
      isOffline,
      lastMutation: state.lastMutation,
      addFriend: (name, birthday) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const friend: Friend = {
          name: trimmed,
          birthday: normalizeBirthday(birthday),
        };
        dispatch({ type: "addFriend", name: trimmed, birthday });

        void insertFriend(friend).catch((error) => {
          if (isOfflineError(error)) {
            setIsOffline(true);
            return;
          }
          console.error("Failed to persist new friend:", error);
        });
      },
      updateFriend: (currentName, input) => {
        const normalizedCurrent = currentName.trim();
        const normalizedNext = input.name.trim();
        if (!normalizedCurrent || !normalizedNext) return;

        const nextFriend: Friend = {
          name: normalizedNext,
          birthday: normalizeBirthday(input.birthday),
        };

        dispatch({
          type: "updateFriend",
          currentName: normalizedCurrent,
          nextName: normalizedNext,
          birthday: input.birthday,
        });

        void updateFriendInStore(normalizedCurrent, nextFriend).catch(
          (error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to update friend in store:", error);
          },
        );
      },
      renameFriend: (currentName, nextName) => {
        const normalizedCurrent = currentName.trim();
        const normalizedNext = nextName.trim();
        if (!normalizedCurrent || !normalizedNext) return;

        const existingFriend = state.friends.find(
          (f) => f.name.toLowerCase() === normalizedCurrent.toLowerCase(),
        );

        const nextFriend: Friend = {
          name: normalizedNext,
          birthday: existingFriend?.birthday,
        };

        dispatch({
          type: "updateFriend",
          currentName: normalizedCurrent,
          nextName: normalizedNext,
        });

        void updateFriendInStore(normalizedCurrent, nextFriend).catch(
          (error) => {
            if (isOfflineError(error)) {
              setIsOffline(true);
              return;
            }
            console.error("Failed to rename friend in store:", error);
          },
        );
      },
      removeFriend: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        dispatch({ type: "removeFriend", name: trimmed });

        void deleteFriendFromStore(trimmed).catch((error) => {
          if (isOfflineError(error)) {
            setIsOffline(true);
            return;
          }
          console.error("Failed to delete friend from store:", error);
        });
      },
    };
  }, [state.friends, state.lastMutation, hasSettled, isOffline]);

  return (
    <FriendsStateContext.Provider value={value}>
      {children}
    </FriendsStateContext.Provider>
  );
}

/**
 * Returns the active friends state context for planner components.
 */
export function useFriendsState() {
  const context = useContext(FriendsStateContext);

  if (!context) {
    throw new Error("useFriendsState must be used inside FriendsProvider.");
  }

  return context;
}
