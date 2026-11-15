import { ErrorMessage, ProgressBar } from "../ui/feedback";
import type { BrowseImageState } from "./BrowseImageLayer";

/**
 * Plain-language status of a browse image: loading (with real progress), not shown and why, or error.
 * Renders nothing when the image is on the map. Put it in BaseMap's `overlay` or in the side panel.
 */
export function BrowseImageStatus({ image, label = "imagem de radar", className }: { image: BrowseImageState; label?: string; className?: string }) {
  if (image.status === "idle" || image.status === "ready") return null;
  const box = `pointer-events-auto w-[min(320px,calc(100vw-2rem))] rounded-[4px] bg-sheet px-3 py-2.5 text-[13px] leading-snug text-ink shadow-[0_0_0_1px_var(--color-rule)] ${className ?? ""}`;

  if (image.status === "loading-info" || image.status === "loading-image") {
    const progress = image.status === "loading-image" ? image.progress : undefined;
    const pct = typeof progress === "number" && progress > 0 ? ` ${Math.round(progress * 100)}%` : "";
    return (
      <div className={box} role="status">
        <p className="mb-1.5">
          {image.status === "loading-info" ? `Localizando ${label}…` : `Baixando ${label} do arquivo da NASA${pct}`}
        </p>
        <ProgressBar value={image.status === "loading-image" && progress ? progress : undefined} label={`Carregando ${label}`} />
        {image.status === "loading-image" ? (
          <p className="mt-1.5 text-[12px] text-ink-3">Estas imagens têm de 2 a 7 MB e o carregamento pode levar alguns segundos.</p>
        ) : null}
      </div>
    );
  }
  if (image.status === "unavailable") {
    return (
      <div className={box} role="status">
        <p className="font-[600]">Esta imagem ({label}) não será exibida</p>
        <p className="text-ink-2">{image.message}</p>
      </div>
    );
  }
  return (
    <div className={box}>
      <ErrorMessage>{image.message}</ErrorMessage>
    </div>
  );
}
