import { DocsCenter } from "@/components/docs-center/DocsCenter";
import type { DocsTabId } from "@/content/docs-center/types";

const validTabs: readonly DocsTabId[] = ["changelog", "rules", "help", "faq"];

function resolveDocsTab(value: string | string[] | undefined): DocsTabId {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate && validTabs.includes(candidate as DocsTabId)) {
    return candidate as DocsTabId;
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
