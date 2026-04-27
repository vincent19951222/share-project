export type DocsTabId = "changelog" | "rules" | "help" | "faq";

export interface DocsTabDefinition {
  id: DocsTabId;
  label: string;
  description: string;
}

export interface DocsChangelogEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  bullets: string[];
  tags?: string[];
}

export interface DocsSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  note?: string;
}
