import type { DocsTabId } from "@/content/docs-center/types";

export interface DocsTocItem {
  id: string;
  label: string;
}

export type DocsTocHrefBase = `${string}?tab=${DocsTabId}`;

interface DocsTableOfContentsProps {
  hrefBase: DocsTocHrefBase;
  items: DocsTocItem[];
}

export function DocsTableOfContents({ hrefBase, items }: DocsTableOfContentsProps) {
  return (
    <nav className="docs-toc" aria-label="当前栏目目录">
      <p className="docs-toc-eyebrow">本页目录</p>
      <ul className="docs-toc-list">
        {items.map((item) => (
          <li key={item.id}>
            <a className="docs-toc-link" href={`${hrefBase}#${item.id}`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
