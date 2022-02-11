import { useEffect, useState } from "react";
import { List, showToast, Toast, LocalStorage } from "@raycast/api";
import { addDays } from "date-fns";
import { range } from "lodash-es";
import superjson from "superjson";
import { getLastJournalEntry, JournalEntry } from "./lib";
import { JournalEntryItem } from "./JournalEntryItem";

export default function Command() {
  const [lastEntry, setLastEntryState] = useState<JournalEntry | null>(null);

  // Set the last entry state and persist it to the cache
  function setLastEntry(entry: JournalEntry) {
    setLastEntryState(entry);
    LocalStorage.setItem("lastEntry", superjson.stringify(entry));
  }

  async function refreshPosts() {
    try {
      setLastEntry(await getLastJournalEntry());
    } catch (err: unknown) {
      showToast(Toast.Style.Failure, "Error", err instanceof Error ? err.message : JSON.stringify(err));
    }
  }

  useEffect(() => {
    // Attempt to load the last entry from the cache first
    LocalStorage.getItem("lastEntry").then((lastEntry) => {
      if (typeof lastEntry === "string") {
        // Use the cached last entry
        setLastEntryState(superjson.parse(lastEntry) as JournalEntry);
        return;
      }

      // Load the journal entries to get the last entry
      refreshPosts();
    });
  });

  if (lastEntry === null) {
    return <List isLoading />;
  }

  return (
    <List>
      <JournalEntryItem
        key="next"
        title="Next day"
        entry={{ date: addDays(lastEntry.date, 1), index: 1 }}
        onCreate={setLastEntry}
        onRefresh={refreshPosts}
      />
      <JournalEntryItem
        key="same"
        title="Same day"
        entry={{ date: lastEntry.date, index: lastEntry.index + 1 }}
        onCreate={setLastEntry}
        onRefresh={refreshPosts}
      />
      {range(1, 8).map((skip) => (
        <JournalEntryItem
          key={`skip:${skip}`}
          title={`Skip ${skip} day${skip === 1 ? "" : "s"}`}
          entry={{ date: addDays(lastEntry.date, skip + 1), index: 1 }}
          onCreate={setLastEntry}
          onRefresh={refreshPosts}
        />
      ))}
    </List>
  );
}
