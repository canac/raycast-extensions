import { Action, ActionPanel, Clipboard, Form, Toast, open, showHUD, showToast } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function scrape(query: string, version: string): Promise<string> {
  const url = `https://www.biblegateway.com/passage/?search=${query}&version=${version}&interface=print`;
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  const sections = $(".result-text-style-normal")
    .map((_, section) => {
      const $section = $(section);
      // Remove all elements except for the main verse text
      $section.find("h3, .full-chap-link, .footnotes, .crossrefs").remove();

      // Each verse is in it's own span
      const $verses = $section.find("span.text");
      // Remove everything except the verse text
      $verses.find(".chapternum, .versenum, .footnote, .crossreference").remove();
      // Combine the individual verses into one string
      return $verses
        .map((_, node) => $(node).text())
        .toArray()
        .join(" ");
    })
    .toArray();
  // BibleGateway puts a reference like Genesis 1:1,3 into two separate sections, so we need to
  // join sections back together that were comma separated. For a query like
  // "Genesis 1:1,3; John 1:1", the first two sections need to be joined and linked to the Genesis
  // reference and the third section needs to be joined to the John reference.
  return query
    .split(/\s*;\s*/)
    .map((reference) => {
      // Pull one section out of the queue for each comma-separated reference segment
      const content = reference
        .split(",")
        .map(() => {
          const section = sections[0];
          sections.shift();
          return section;
        })
        .join(" … ");
      return `${content} (${reference} ${version})`;
    })
    .join("\n\n");
}

// Raw references can end with " /{version}" to manually set the version
// Extract the reference and version from that string
function parseReference(rawReference: string): { reference: string; version: string } {
  const defaultVersion = "ESV";
  const matches = /^(?<reference>.+?)(?:\s+\/(?<version>.+))?$/.exec(rawReference);
  if (!matches?.groups) {
    throw new Error("Invalid reference format");
  }

  return {
    reference: matches.groups.reference,
    version: matches.groups.version ?? defaultVersion,
  };
}

// Given a raw reference, lookup the verse text
async function lookupReference(rawReference: string): Promise<{ text: string; reference: string; version: string }> {
  const { reference, version } = parseReference(rawReference);
  const text = await scrape(reference, version);
  return {
    text,
    reference,
    version,
  };
}

// Display an error to the user
function showError(err: unknown) {
  showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: err instanceof Error ? err.message : "Unknown error occurred",
  });
}

export default function Command() {
  const [rawReference, setReference] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Copy passage"
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            onAction={async () => {
              try {
                const { text, reference, version } = await lookupReference(rawReference);
                Clipboard.copy(text);
                await showHUD(`Copied ${reference} (${version}) to clipboard`);
              } catch (err) {
                showError(err);
              }
            }}
          />
          <Action
            title="Paste passage"
            shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
            onAction={async () => {
              try {
                const { text, reference, version } = await lookupReference(rawReference);
                Clipboard.paste(text);
                await showHUD(`Pasted ${reference} (${version}) to clipboard`);
              } catch (err) {
                showError(err);
              }
            }}
          />
          <Action
            title="Open in BibleGateway.com"
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={() => {
              try {
                const { reference, version } = parseReference(rawReference);
                open(
                  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(
                    reference
                  )}&version=${encodeURIComponent(version)}`
                );
              } catch (err) {
                showError(err);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="reference" title="Passage reference" value={rawReference} onChange={setReference} />
    </Form>
  );
}
