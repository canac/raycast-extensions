import { exec } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { format } from "date-fns";
import { mapValues } from "lodash-es";

export type JournalEntry = {
  date: Date;
  index: number;
};

const journalDir = "/Users/caleb/dev/journal";
const postsDir = join(journalDir, "jekyll", "_posts");
const postFilenamePattern = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})-(?<index>\d+)\.md$/;

// Find the most recent journal entry
export async function getLastJournalEntry(): Promise<JournalEntry> {
  for (const file of (await readdir(postsDir)).reverse()) {
    const matches = postFilenamePattern.exec(file);
    if (matches) {
      const { year, month, day, index } = mapValues(matches.groups, (str) => parseInt(str, 10));
      return {
        date: new Date(year, month - 1, day),
        index,
      };
    }
  }

  throw new Error("No journal entries found");
}

// Create the journal entry file and open it in VS Code
export async function createJournalEntry(entry: JournalEntry) {
  const numberFormattedDate = format(entry.date, "yyyy-MM-dd");
  const wordFormattedDate = format(entry.date, "EEEE, MMMM d, y");
  const newFilename = join(postsDir, `${numberFormattedDate}-${entry.index}.md`);
  await writeFile(
    newFilename,
    `---
title: '${wordFormattedDate} #${entry.index}'
date: ${numberFormattedDate}
tags: ` +
      `
---

Jesus, `
  );
  await exec(`code ${journalDir} --goto "${newFilename}:4:7" --new-window`);
}

// Return a list of all the tags used across all journal entries
export async function getTags(): Promise<string[]> {
  const usedTags = new Set<string>();
  for (const filename of await readdir(postsDir)) {
    if (!postFilenamePattern.test(filename)) {
      continue;
    }

    const post = await readFile(join(postsDir, filename), "utf8");
    const matches = /---\n[\s\S]*tags: ?(.*)[\s\S]*\n---\n/g.exec(post);
    if (!matches) {
      throw new Error(`Could not extract tags from ${filename}`);
    }

    const tags = matches[1];
    if (!tags) {
      // The post had no tags
      continue;
    }

    // Ignore tag case
    tags
      .toLowerCase()
      .split(" ")
      .forEach((tag) => {
        usedTags.add(tag);
      });
  }

  // Sort tags alphabetically
  return Array.from(usedTags.keys()).sort();
}
