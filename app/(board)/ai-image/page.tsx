import { AiImageWorkspace } from "@/components/gamification/ai-image/AiImageWorkspace";
import { Navbar } from "@/components/navbar/Navbar";
import type { AiImagePanelKey } from "@/lib/navigation-routes";

function normalizeView(view: string | undefined): AiImagePanelKey {
  if (view === "themes" || view === "artworks") {
    return view;
  }

  return "studio";
}

export default async function AiImagePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <Navbar activeTabOverride={null} />
      <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        <AiImageWorkspace initialPanel={normalizeView(params.view)} />
      </main>
    </>
  );
}
