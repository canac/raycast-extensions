import childProcess from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

const exec = promisify(childProcess.exec);

// Find all of the repos in searchDir that contain worktrees
async function findReposWithWorktrees(searchDir: string): Promise<string[]> {
  const { stdout } = await exec(`find '${searchDir}' -type d -path '*/.git/worktrees' -maxdepth 3`);
  return stdout
    .trim()
    .split("\n")
    .map((line) => line.slice(0, -"/.git/worktrees".length));
}

export interface Worktree {
  path: string;
  commit: string;
  branch: string;
  dirty: boolean;
}

// Find all of the worktrees in a git repo
async function getRepoWorktrees(repoDir: string): Promise<Worktree[]> {
  const { stdout } = await exec(`git -C '${repoDir}' worktree list`);
  const worktrees = stdout
    .trim()
    .split("\n")
    .flatMap((line) => {
      const matches = /^(?<path>\S+) +(?<commit>[0-9a-f]{7}) \[(?<branch>.+)\]$/.exec(line);
      if (
        matches?.groups?.path &&
        matches?.groups?.commit &&
        matches?.groups?.branch &&
        matches.groups.path !== repoDir
      ) {
        return [
          { path: matches.groups.path, commit: matches.groups.commit, branch: matches.groups.branch, dirty: false },
        ];
      }
      return [];
    });
  return await Promise.all(
    worktrees.map(async (worktree) => {
      const { stdout } = await exec(`git -C '${worktree.path}' status -s`);
      return {
        ...worktree,
        dirty: stdout.trim().length > 0,
      };
    })
  );
}

// Remove a git worktree, returning a promise that resolves to true if it was successfully removed
export async function removeWorktree(repoDir: string, worktreeDir: string): Promise<boolean> {
  try {
    await exec(`git -C '${repoDir}' worktree remove '${worktreeDir}'`);
    return true;
  } catch (err) {
    return false;
  }
}

type WorktreesMap = Record<string, Worktree[]>;

export function useWorktrees(searchDir: string): ReturnType<typeof useCachedPromise<() => Promise<WorktreesMap>>> {
  return useCachedPromise(
    async (searchDir): Promise<WorktreesMap> => {
      const repos = await findReposWithWorktrees(searchDir);
      const worktrees = await Promise.all(repos.map(async (repo) => [repo, await getRepoWorktrees(repo)] as const));
      return Object.fromEntries(worktrees);
    },
    [searchDir]
  );
}

const home = process.env.HOME ?? "";

// Return the directory containing the git repos specified in preferences
export function getRootDir(): string {
  const { rootDir } = getPreferenceValues<ExtensionPreferences>();
  return rootDir.replace("~", home);
}

// Prettify a repo dir for display in the UI
export function formatRepoDir(repoDir: string): string {
  if (repoDir.startsWith(home + "/")) {
    return repoDir.replace(home + "/", "~/");
  }
  return repoDir;
}
