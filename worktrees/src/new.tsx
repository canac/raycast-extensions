import { Action, ActionPanel, Form, Toast, getPreferenceValues, open, popToRoot, showToast } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { addWorktree, findRepos, formatPath, getDefaultBranch, getRootDir } from "./helpers";
import { useEffect, useState } from "react";
import { join } from "node:path";

export default function Command() {
  const rootDir = getRootDir();
  const { data: repos, isLoading } = useCachedPromise((searchDir) => findRepos(searchDir), [rootDir]);
  const [prefixes, setPrefixes] = useCachedState<Record<string, string>>("prefixes", {});
  const [repo, setRepo] = useState("");
  const [prefix, setPrefix] = useState("");
  const [branch, setBranch] = useState("");
  const [branchError, setBranchError] = useState("");
  const { data: startBranch } = usePromise((repoDir) => getDefaultBranch(repoDir), [repo]);

  useEffect(() => {
    if (repos?.length === 0) {
      showToast({
        title: "No git repos",
        message: "Could not find any git repos to create a worktree for. Try checking your repo dir setting.",
        style: Toast.Style.Failure,
      });
    }
  }, [repos]);

  useEffect(() => {
    setPrefix(prefixes[repo] ?? "");
  }, [repo]);

  const path = repo && branch ? join(repo, "..", prefix ? `${prefix}-${branch}` : branch) : null;

  const handleSubmit = async () => {
    if (!path || !startBranch) {
      return;
    }

    setPrefixes({ ...prefixes, [repo]: prefix });

    try {
      await addWorktree(repo, path, branch, startBranch);
      await open(path, getPreferenceValues<ExtensionPreferences>().editorApp.bundleId);
      await popToRoot();
    } catch (err) {
      await showToast({
        title: "Could not add worktree!",
        message: err instanceof Error ? err.message : undefined,
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Worktree" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {path !== null && (
        <Form.Description
          title="Summary"
          text={`A new worktree will be added for ${formatPath(repo)} at ${formatPath(
            path
          )} with the branch ${branch} off of ${startBranch ?? "(calculating)"}`}
        />
      )}
      <Form.Dropdown id="repo" title="Repo" isLoading={isLoading} value={repo} onChange={setRepo} storeValue>
        {repos?.map((repo) => (
          <Form.Dropdown.Item key={repo} value={repo} title={formatPath(repo)} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="prefix"
        title="Directory Prefix"
        placeholder="Directory prefix shared by all of this repo's new worktrees"
        value={prefix}
        onChange={setPrefix}
      />
      <Form.TextField
        id="branch"
        title="Branch Name"
        placeholder="Name of the new worktree's branch"
        value={branch}
        onChange={setBranch}
        error={branchError}
        onBlur={() => setBranchError(branch === "" ? "Branch must not be empty" : "")}
      />
    </Form>
  );
}
