import { BoardApp } from "@/components/board/BoardApp";
import { DRINK_TYPES, drinkCatalog } from "@/lib/drinks";

export default function DrinkRoutePage() {
  return (
    <>
      {DRINK_TYPES.map((type) => (
        <link
          rel="preload"
          as="image"
          href={drinkCatalog[type].asset}
          type="image/webp"
          key={type}
        />
      ))}
      <BoardApp activeTab="coffee" />
    </>
  );
}
