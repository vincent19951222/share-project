import type { DocsSection as DocsSectionContent } from "@/content/docs-center/types";

interface DocsSectionProps {
  section: DocsSectionContent;
}

export function DocsSection({ section }: DocsSectionProps) {
  return (
    <article id={section.id} className="docs-section">
      <div className="docs-section-kicker">SECTION</div>
      <h2 className="docs-section-title">{section.title}</h2>
      <p className="docs-section-summary">{section.summary}</p>
      <ul className="docs-section-list">
        {section.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {section.note ? <p className="docs-section-note">{section.note}</p> : null}
    </article>
  );
}
