"use client";

import { useState, type FormEvent } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import type { Friend } from "@/features/friends/lib/friend";
import { useFriendsState } from "@/features/friends/state/friends-state";

type ManageFriendsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ManageFriendsModal({
  isOpen,
  onClose,
}: ManageFriendsModalProps) {
  const { friends, addFriend, updateFriend, removeFriend } = useFriendsState();
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendBirthday, setNewFriendBirthday] = useState("");
  const [editingFriendName, setEditingFriendName] = useState<string | null>(
    null,
  );
  const [editingFriendValue, setEditingFriendValue] = useState("");
  const [editingFriendBirthday, setEditingFriendBirthday] = useState("");
  const [friendToDelete, setFriendToDelete] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  function handleAddFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    addFriend(newFriendName, newFriendBirthday || undefined);
    setNewFriendName("");
    setNewFriendBirthday("");
  }

  function startEditingFriend(friend: Friend) {
    setEditingFriendName(friend.name);
    setEditingFriendValue(friend.name);
    setEditingFriendBirthday(friend.birthday ?? "");
  }

  function cancelEditingFriend() {
    setEditingFriendName(null);
    setEditingFriendValue("");
    setEditingFriendBirthday("");
  }

  function saveEditedFriend() {
    if (!editingFriendName) {
      return;
    }

    updateFriend(editingFriendName, {
      name: editingFriendValue,
      birthday: editingFriendBirthday,
    });
    cancelEditingFriend();
  }

  function closeModal() {
    cancelEditingFriend();
    setFriendToDelete(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      onClick={closeModal}
    >
      <section
        className="w-full max-w-md rounded-2xl border border-sam-border bg-sam-surface p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sam-text-3">
          Manage Friends
        </p>

        <form
          onSubmit={handleAddFriend}
          className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto]"
        >
          <input
            value={newFriendName}
            onChange={(event) => setNewFriendName(event.target.value)}
            placeholder="Add friend"
            maxLength={15}
            className="min-w-0 flex-1 rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:ring-slate-600"
          />
          <DatePicker
            value={newFriendBirthday}
            onChange={setNewFriendBirthday}
            placeholder="Birthday"
            clearLabel="Clear birthday"
            ariaLabel="Birthday"
            className="min-w-0"
            buttonClassName="px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-sam-solid px-3 py-2 text-sm font-medium text-sam-solid-fg hover:bg-slate-700 dark:hover:bg-slate-200"
          >
            Add
          </button>
        </form>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {friends.map((friend) => (
            <div
              key={friend.name}
              className="rounded-xl border border-sam-border bg-sam-surface-2/80 p-2"
            >
              {friendToDelete === friend.name ? (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-2">
                  <p className="text-xs font-medium text-red-800 dark:text-red-700 text-center">
                    Remove {friend.name} from all events?
                    <br />
                    <span className="mt-1 block font-normal opacity-80 dark:opacity-100 dark:text-red-500">
                      (Be careful, it&apos;s always easier to lose friends than
                      to make new ones!)
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFriendToDelete(null)}
                      className="flex-1 rounded-md border border-sam-border bg-sam-surface px-2 py-1.5 text-xs text-sam-text-2 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeFriend(friend.name);
                        setFriendToDelete(null);
                      }}
                      className="flex-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Yes, remove
                    </button>
                  </div>
                </div>
              ) : editingFriendName === friend.name ? (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto_auto] sm:items-center">
                  <input
                    value={editingFriendValue}
                    onChange={(event) =>
                      setEditingFriendValue(event.target.value)
                    }
                    maxLength={15}
                    className="min-w-0 flex-1 rounded-lg border border-sam-border bg-sam-surface px-3 py-1.5 text-sm text-sam-text-2 outline-none ring-slate-300 focus:ring dark:ring-slate-600"
                    aria-label={`Edit ${friend.name}`}
                  />
                  <DatePicker
                    value={editingFriendBirthday}
                    onChange={setEditingFriendBirthday}
                    placeholder="Birthday"
                    clearLabel="Clear birthday"
                    ariaLabel={`Birthday for ${friend.name}`}
                    className="min-w-0"
                    buttonClassName="px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveEditedFriend}
                    className="rounded-md border border-sam-border bg-sam-surface px-2 py-1 text-xs text-sam-text-2 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingFriend}
                    className="rounded-md border border-sam-border bg-sam-surface px-2 py-1 text-xs text-sam-text-3 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block truncate text-sm text-sam-text-2">
                      {friend.name}
                    </span>
                    {friend.birthday ? (
                      <span className="block text-[11px] text-sam-text-3">
                        Birthday: {friend.birthday}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditingFriend(friend)}
                      className="rounded-md border border-sam-border bg-sam-surface px-2 py-1 text-xs text-sam-text-3 hover:bg-sam-surface-3 dark:hover:bg-slate-600"
                      aria-label={`Edit ${friend.name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingFriendName === friend.name) {
                          cancelEditingFriend();
                        }
                        setFriendToDelete(friend.name);
                      }}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900"
                      aria-label={`Remove ${friend.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {friends.length === 0 ? (
            <p className="rounded-lg border border-dashed border-sam-border bg-sam-surface-2 px-3 py-5 text-center text-xs text-sam-text-3">
              No friends yet. Add someone to start assigning participants.
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-sam-border bg-sam-surface px-3 py-2 text-sm text-sam-text-2"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
