import { Action, ActionPanel, closeMainWindow, List } from "@raycast/api";
import { format } from "date-fns";
import { ReactElement } from "react";
import { createJournalEntry, JournalEntry } from "./lib";

type JournalEntryItemProps = {
  title: string;
  entry: JournalEntry;
  onCreate?: (entry: JournalEntry) => void;
  onRefresh?: () => void;
};

export function JournalEntryItem(props: JournalEntryItemProps): ReactElement {
  const { title, entry, onCreate, onRefresh } = props;

  return (
    <List.Item
      title={title}
      subtitle={`${format(entry.date, "EEEE, MMMM d")}`}
      actions={
        <ActionPanel>
          <Action
            title="Start journaling"
            onAction={async () => {
              await createJournalEntry(entry);
              if (onCreate) {
                // Notify the parent that this journal entry was created
                onCreate(entry);
              }
              closeMainWindow();
            }}
          />
          <Action title="Refresh posts" shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
