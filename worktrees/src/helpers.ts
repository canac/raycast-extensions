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
  commit: string | null;
  branch: string | null;
  dirty: boolean;
}

// Find all of the worktrees in a git repo
async function getRepoWorktrees(repoDir: string): Promise<Worktree[]> {
  const { stdout } = await exec(`git -C '${repoDir}' worktree list --porcelain`);
  const worktrees = stdout
    .trim()
    .split("\n\n")
    .map((section) => {
      let worktree: string | null = null;
      let commit: string | null = null;
      let branch: string | null = null;
      section.split("\n").forEach((line) => {
        if (line.startsWith("worktree ")) {
          worktree = line.slice(9);
        } else if (line.startsWith("HEAD ")) {
          commit = line.slice(5);
        } else if (line.startsWith("branch refs/heads/")) {
          branch = line.slice(18);
        }
      });

      if (!worktree) {
        throw new Error("Missing worktree!");
      }
      return {
        path: worktree,
        commit,
        branch,
        dirty: false,
      };
    })
    .filter(({ path }) => path !== repoDir);
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

// Remove a git worktree, throwing an exception if it failed
export async function removeWorktree(repoDir: string, worktreeDir: string): Promise<void> {
  await exec(`git -C '${repoDir}' worktree remove '${worktreeDir}'`);
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

// Prettify a path for display in the UI
export function formatPath(path: string): string {
  if (path.startsWith(home + "/")) {
    return path.replace(home + "/", "~/");
  }
  return path;
}
