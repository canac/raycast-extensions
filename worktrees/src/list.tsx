import { relative } from "node:path";
import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert } from "@raycast/api";
import { showHUD } from "@raycast/api";
import { getRootDir, formatRepoDir, removeWorktree, useWorktrees, Worktree } from "./helpers";

export default function Command() {
  const rootDir = getRootDir();
  const { data: worktrees, isLoading, revalidate } = useWorktrees(rootDir);

  async function handleRemove(repo: string, worktree: Worktree) {
    if (
      !(await confirmAlert({
        title: "Are you sure you want to remove the worktree?",
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    ) {
      return;
    }

    if (await removeWorktree(repo, worktree.path)) {
      revalidate();
    } else {
      showHUD("Could not remove worktree");
    }
  }

  return (
    <List isLoading={isLoading}>
      {Object.entries(worktrees ?? {}).map(([repo, worktrees]) => (
        <List.Section title={formatRepoDir(repo)} key={repo}>
          {worktrees.map((worktree) => (
            <List.Item
              key={worktree.branch}
              icon={Icon.Folder}
              title={relative(rootDir, worktree.path)}
              subtitle={`${worktree.branch ?? "detached"} @ ${worktree.commit?.slice(0, 7) ?? "none"}`}
              accessories={worktree.dirty ? [{ text: { value: "Dirty", color: Color.Yellow } }] : undefined}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Open in VS Code"
                    icon={Icon.Pencil}
                    target={worktree.path}
                    application="com.microsoft.VSCode"
                  />
                  <Action.Open
                    title="Open in iTerm"
                    icon={Icon.Terminal}
                    target={worktree.path}
                    application="com.googlecode.iterm2"
                  />
                  {!worktree.dirty && (
                    <Action
                      title="Remove Worktree"
                      shortcut={{ key: "x", modifiers: ["ctrl"] }}
                      style={Action.Style.Destructive}
                      onAction={() => handleRemove(repo, worktree)}
                    />
                  )}
                  <Action
                    title="Refresh"
                    shortcut={{ key: "r", modifiers: ["cmd"] }}
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
