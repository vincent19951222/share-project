import { DocsCenter } from "@/components/docs-center/DocsCenter";
import { docsTabs } from "@/content/docs-center/tabs";
import type { DocsTabId } from "@/content/docs-center/types";

function isDocsTabId(value: string): value is DocsTabId {
  return docsTabs.some((tab) => tab.id === value);
}

function resolveDocsTab(value: string | string[] | undefined): DocsTabId {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate && isDocsTabId(candidate)) {
    return candidate;
  }

  return "changelog";
}

interface DocsPageProps {
  searchParams: Promise<{
    tab?: string | string[];
  }>;
}

export default async function DocsPage({ searchParams }: DocsPageProps) {
  const params = await searchParams;
  const initialTab = resolveDocsTab(params.tab);

  return (
    <div className="p-4 sm:p-6">
      <DocsCenter initialTab={initialTab} />
    </div>
  );
}
