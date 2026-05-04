"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { SEMESTER_FRIENDS } from "@/features/planner/lib/planner";
import {
  getDefaultFriends,
  loadFriends,
  saveFriends,
} from "@/features/friends/lib/friends-persistence";

type FriendMutation =
  | { type: "add"; name: string }
  | { type: "rename"; currentName: string; nextName: string }
  | { type: "remove"; name: string }
  | null;

type FriendsStateContextValue = {
  friends: string[];
  isHydrated: boolean;
  addFriend: (name: string) => void;
  renameFriend: (currentName: string, nextName: string) => void;
  removeFriend: (name: string) => void;
  lastMutation: FriendMutation;
};

type FriendsProviderProps = {
  children: ReactNode;
};

const FriendsStateContext = createContext<FriendsStateContextValue | null>(
  null,
);

function normalizeFriendName(name: string) {
  return name.trim();
}

function dedupeParticipantNames(participants: string[]) {
  const uniqueByLowerCase = new Map<string, string>();

  for (const participant of participants) {
    const normalized = normalizeFriendName(participant);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLocaleLowerCase();

    if (!uniqueByLowerCase.has(key)) {
      uniqueByLowerCase.set(key, normalized);
    }
  }

  return Array.from(uniqueByLowerCase.values());
}

export function FriendsProvider({ children }: FriendsProviderProps) {
  const [friends, setFriends] = useState<string[]>(getDefaultFriends);
  const [lastMutation, setLastMutation] = useState<FriendMutation>(null);
  const [persistenceError, setPersistenceError] = useState<Error | null>(null);
  const [didHydrateFromStorage, setDidHydrateFromStorage] = useState(false);

  if (persistenceError) {
    throw persistenceError;
  }

  useEffect(() => {
    let cancelled = false;

    void loadFriends()
      .then((friendsFromStore) => {
        if (cancelled) {
          return;
        }

        const hydratedFriends = dedupeParticipantNames(
          friendsFromStore && friendsFromStore.length > 0
            ? friendsFromStore
            : [...SEMESTER_FRIENDS],
        ).sort((left, right) => left.localeCompare(right));

        setFriends(hydratedFriends);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPersistenceError(
            error instanceof Error
              ? error
              : new Error("Failed to hydrate planner friends from Supabase."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDidHydrateFromStorage(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didHydrateFromStorage) {
      return;
    }

    void saveFriends(friends).catch((error: unknown) => {
      setPersistenceError(
        error instanceof Error
          ? error
          : new Error("Failed to persist planner friends to Supabase."),
      );
    });
  }, [didHydrateFromStorage, friends]);

  const value = useMemo<FriendsStateContextValue>(() => {
    return {
      friends,
      isHydrated: didHydrateFromStorage,
      lastMutation,
      addFriend: (name) => {
        const normalizedName = normalizeFriendName(name);

        if (!normalizedName) {
          return;
        }

        const isDuplicate = friends.some(
          (friend) =>
            friend.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
        );

        if (isDuplicate) {
          return;
        }

        const nextFriends = [...friends, normalizedName].sort((left, right) =>
          left.localeCompare(right),
        );

        setFriends(nextFriends);
        setLastMutation({ type: "add", name: normalizedName });
      },
      renameFriend: (currentName, nextName) => {
        const normalizedCurrentName = normalizeFriendName(currentName);
        const normalizedNextName = normalizeFriendName(nextName);

        if (!normalizedCurrentName || !normalizedNextName) {
          return;
        }

        if (
          normalizedCurrentName.toLocaleLowerCase() ===
          normalizedNextName.toLocaleLowerCase()
        ) {
          return;
        }

        const hasCurrentName = friends.some(
          (friend) =>
            friend.toLocaleLowerCase() ===
            normalizedCurrentName.toLocaleLowerCase(),
        );
        const hasTargetName = friends.some(
          (friend) =>
            friend.toLocaleLowerCase() ===
            normalizedNextName.toLocaleLowerCase(),
        );

        if (!hasCurrentName || hasTargetName) {
          return;
        }

        const nextFriends = friends
          .map((friend) =>
            friend.toLocaleLowerCase() ===
            normalizedCurrentName.toLocaleLowerCase()
              ? normalizedNextName
              : friend,
          )
          .sort((left, right) => left.localeCompare(right));

        setFriends(nextFriends);
        setLastMutation({
          type: "rename",
          currentName: normalizedCurrentName,
          nextName: normalizedNextName,
        });
      },
      removeFriend: (name) => {
        const normalizedName = normalizeFriendName(name);

        if (!normalizedName) {
          return;
        }

        const nextFriends = friends.filter(
          (friend) =>
            friend.toLocaleLowerCase() !== normalizedName.toLocaleLowerCase(),
        );

        if (nextFriends.length === friends.length) {
          return;
        }

        setFriends(nextFriends);
        setLastMutation({ type: "remove", name: normalizedName });
      },
    };
  }, [friends, didHydrateFromStorage, lastMutation]);

  return (
    <FriendsStateContext.Provider value={value}>
      {children}
    </FriendsStateContext.Provider>
  );
}

export function useFriendsState() {
  const context = useContext(FriendsStateContext);

  if (!context) {
    throw new Error("useFriendsState must be used inside FriendsProvider.");
  }

  return context;
}
