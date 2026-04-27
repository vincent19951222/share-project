export interface DocsTocItem {
  id: string;
  label: string;
}

interface DocsTableOfContentsProps {
  tab: string;
  items: DocsTocItem[];
}

export function DocsTableOfContents({ tab, items }: DocsTableOfContentsProps) {
  return (
    <nav className="docs-toc" aria-label="当前栏目目录">
      <p className="docs-toc-eyebrow">本页索引</p>
      <ul className="docs-toc-list">
        {items.map((item) => (
          <li key={item.id}>
            <a className="docs-toc-link" href={`/docs?tab=${tab}#${item.id}`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
