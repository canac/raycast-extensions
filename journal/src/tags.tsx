import { Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { List, showToast, Toast, LocalStorage, ActionPanel, Action, clearSearchBar } from "@raycast/api";
import { getTags } from "./lib";

export default function Command() {
  const [tags, setTags] = useState<string[] | null>(null);

  async function refreshTags() {
    try {
      const tags = await getTags();
      setTags(tags);
      LocalStorage.setItem("tags", JSON.stringify(tags));
    } catch (err: unknown) {
      showToast(Toast.Style.Failure, "Error", err instanceof Error ? err.message : JSON.stringify(err));
    }
  }

  async function onCopy(tag: string) {
    Clipboard.copy(`${tag} `);
    clearSearchBar();
  }

  function onPaste(tag: string) {
    Clipboard.paste(`${tag} `);
    clearSearchBar();
  }

  useEffect(() => {
    // Attempt to load the tags from the cache first
    LocalStorage.getItem("tags").then((tags) => {
      if (typeof tags === "string") {
        // Use the cached tags
        setTags(JSON.parse(tags) as string[]);
        return;
      }

      // Load the tags
      refreshTags();
    });
  }, []);

  if (tags === null) {
    return <List isLoading />;
  }

  return (
    <List>
      {tags.map((tag) => (
        <List.Item
          title={tag}
          key={tag}
          actions={
            <ActionPanel>
              <Action title="Paste tag" onAction={() => onPaste(tag)} />
              <Action title="Copy tag" onAction={() => onCopy(tag)} />
              <Action
                title="Refresh tags"
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={refreshTags}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
