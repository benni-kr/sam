"use client";

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

type FriendState = {
  friends: string[];
  lastMutation: FriendMutation;
};

type FriendAction =
  | { type: "hydrate"; friends: string[] }
  | { type: "addFriend"; name: string }
  | { type: "renameFriend"; currentName: string; nextName: string }
  | { type: "removeFriend"; name: string };

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

function friendsReducer(state: FriendState, action: FriendAction): FriendState {
  switch (action.type) {
    case "hydrate": {
      return {
        friends: action.friends,
        lastMutation: null,
      };
    }

    case "addFriend": {
      const normalizedName = normalizeFriendName(action.name);

      if (!normalizedName) {
        return state;
      }

      if (
        state.friends.some(
          (friend) =>
            friend.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
        )
      ) {
        return state;
      }

      return {
        friends: [...state.friends, normalizedName].sort((left, right) =>
          left.localeCompare(right),
        ),
        lastMutation: { type: "add", name: normalizedName },
      };
    }

    case "renameFriend": {
      const normalizedCurrentName = normalizeFriendName(action.currentName);
      const normalizedNextName = normalizeFriendName(action.nextName);

      if (!normalizedCurrentName || !normalizedNextName) {
        return state;
      }

      if (
        normalizedCurrentName.toLocaleLowerCase() ===
        normalizedNextName.toLocaleLowerCase()
      ) {
        return state;
      }

      const hasCurrentName = state.friends.some(
        (friend) =>
          friend.toLocaleLowerCase() ===
          normalizedCurrentName.toLocaleLowerCase(),
      );
      const hasTargetName = state.friends.some(
        (friend) =>
          friend.toLocaleLowerCase() === normalizedNextName.toLocaleLowerCase(),
      );

      if (!hasCurrentName || hasTargetName) {
        return state;
      }

      return {
        friends: state.friends
          .map((friend) =>
            friend.toLocaleLowerCase() ===
            normalizedCurrentName.toLocaleLowerCase()
              ? normalizedNextName
              : friend,
          )
          .sort((left, right) => left.localeCompare(right)),
        lastMutation: {
          type: "rename",
          currentName: normalizedCurrentName,
          nextName: normalizedNextName,
        },
      };
    }

    case "removeFriend": {
      const normalizedName = normalizeFriendName(action.name);

      if (!normalizedName) {
        return state;
      }

      const nextFriends = state.friends.filter(
        (friend) =>
          friend.toLocaleLowerCase() !== normalizedName.toLocaleLowerCase(),
      );

      if (nextFriends.length === state.friends.length) {
        return state;
      }

      return {
        friends: nextFriends,
        lastMutation: { type: "remove", name: normalizedName },
      };
    }

    default:
      return state;
  }
}

export function FriendsProvider({ children }: FriendsProviderProps) {
  const [state, dispatch] = useReducer(friendsReducer, {
    friends: getDefaultFriends(),
    lastMutation: null,
  });
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

        dispatch({ type: "hydrate", friends: hydratedFriends });
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

    void saveFriends(state.friends).catch((error: unknown) => {
      setPersistenceError(
        error instanceof Error
          ? error
          : new Error("Failed to persist planner friends to Supabase."),
      );
    });
  }, [didHydrateFromStorage, state.friends]);

  const value = useMemo<FriendsStateContextValue>(() => {
    return {
      friends: state.friends,
      isHydrated: didHydrateFromStorage,
      lastMutation: state.lastMutation,
      addFriend: (name) => {
        dispatch({ type: "addFriend", name });
      },
      renameFriend: (currentName, nextName) => {
        dispatch({ type: "renameFriend", currentName, nextName });
      },
      removeFriend: (name) => {
        dispatch({ type: "removeFriend", name });
      },
    };
  }, [state.friends, state.lastMutation, didHydrateFromStorage]);

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
