import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { BBox, IsoDate } from "../api/types";
import { ProgressBar } from "../ui/feedback";
import { formatDateLong } from "../ui/format";
import { BaseMap } from "./BaseMap";
import { bboxToBounds } from "./basemapConfig";
import { extendSouth, keyToSide, type Side } from "./beforeAfter";
import { BrowseImageLayer, useBrowseImage, type BrowseImageState } from "./BrowseImageLayer";
import { BrowseImageStatus } from "./BrowseImageStatus";
import { ShorelineOverlay } from "./layers";

export interface BeforeAfterImage {
  passId: string | undefined;
  date: IsoDate;
}

export interface BeforeAfterMapProps {
  before: BeforeAfterImage;
  after: BeforeAfterImage;
  /** Area shown when the map first appears. */
  initialBbox: BBox;
  /** Area to frame for the current pair. When it changes (another pair was chosen), the map moves there. */
  pairBbox?: BBox;
  /** Which image shows first. Default: after. */
  initialSide?: Side;
  /** Extra things inside the map (markers, layers). */
  children?: ReactNode;
}

/** Share of the framed height added below the area, so the switch at the bottom does not cover it. */
const SWITCH_ROOM = 0.25;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Before/after viewer: both radar images sit on the same map, positioned by georef.corners, and one of them
 * is visible at a time. Flipping only changes which layer is opaque, so it is instant once both have downloaded
 * and the view stays exactly where it is. Space flips, B shows before, A shows after (anywhere on the page).
 */
export function BeforeAfterMap({ before, after, initialBbox, pairBbox, initialSide = "after", children }: BeforeAfterMapProps) {
  const beforeImage = useBrowseImage(before.passId);
  const afterImage = useBrowseImage(after.passId);
  const [side, setSide] = useState<Side>(initialSide);
  const [showOutline, setShowOutline] = useState(false);

  // Keyboard shortcuts, read through a ref so the listener is attached once.
  const sideRef = useRef(side);
  sideRef.current = side;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      const next = keyToSide(
        {
          key: e.key,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          targetTag: target?.tagName,
          targetEditable: target?.isContentEditable,
        },
        sideRef.current,
      );
      if (next === null) return;
      e.preventDefault();
      setSide(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const images: Record<Side, { image: BrowseImageState; date: IsoDate }> = {
    before: { image: beforeImage, date: before.date },
    after: { image: afterImage, date: after.date },
  };
  const loading = (["before", "after"] as const).filter((s) => isLoading(images[s].image));
  const problems = (["before", "after"] as const).filter((s) => {
    const st = images[s].image.status;
    return st === "unavailable" || st === "error";
  });

  const overlay = (
    <>
      <div className="absolute left-3 top-3 flex flex-col gap-2">
        {loading.length > 0 ? <LoadingBox sides={loading} images={images} /> : null}
        {problems.map((s) => (
          <BrowseImageStatus key={s} image={images[s].image} label={`${s} image (${formatDateLong(images[s].date)})`} />
        ))}
      </div>
      <div className="absolute inset-x-3 bottom-14 flex sm:bottom-8 flex-col items-center gap-1.5">
        <SideSwitch side={side} onChange={setSide} images={images} />
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-[4px] bg-sheet/95 px-3 py-1.5 text-[12px] text-ink-2 shadow-[0_0_0_1px_var(--color-rule)]">
          <span className="hidden sm:inline">
            <Kbd>Space</Kbd> flips the image, <Kbd>B</Kbd> before, <Kbd>A</Kbd> after
          </span>
          <label className="flex cursor-pointer items-center gap-1.5 text-ink">
            <input
              type="checkbox"
              checked={showOutline}
              onChange={(e) => setShowOutline(e.target.checked)}
              className="size-3.5 accent-ink"
            />
            Usual water outline (from the basemap)
          </label>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        Showing the {side} image, {formatDateLong(images[side].date)}.
      </p>
    </>
  );

  return (
    <BaseMap initialBbox={extendSouth(initialBbox, SWITCH_ROOM)} initialPadding={24} overlay={overlay}>
      <BrowseImageLayer id="before" image={beforeImage} opacity={side === "before" ? 1 : 0} />
      <BrowseImageLayer id="after" image={afterImage} opacity={side === "after" ? 1 : 0} />
      <ShorelineOverlay visible={showOutline} />
      <FitOnChange bbox={pairBbox} />
      {children}
    </BaseMap>
  );
}

function isLoading(image: BrowseImageState): boolean {
  return image.status === "loading-info" || image.status === "loading-image";
}

function progressOf(image: BrowseImageState): number | null {
  return image.status === "loading-image" && typeof image.progress === "number" ? image.progress : null;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[3px] border border-rule-strong bg-paper px-1 py-px font-sans text-[11px] font-[600] text-ink">
      {children}
    </kbd>
  );
}

const SIDE_LABEL: Record<Side, string> = { before: "Before", after: "After" };

/**
 * The two-date switch. The shown image is a block of ink with a signal-yellow edge; the other is paper.
 * Both dates are always on screen.
 */
function SideSwitch({
  side,
  onChange,
  images,
}: {
  side: Side;
  onChange: (s: Side) => void;
  images: Record<Side, { image: BrowseImageState; date: IsoDate }>;
}) {
  return (
    <div
      role="group"
      aria-label="Radar image shown on the map"
      className="pointer-events-auto flex w-full max-w-[400px] overflow-hidden rounded-[4px] shadow-[0_0_0_1.5px_var(--color-ink),0_6px_18px_-8px_rgb(22_32_42/0.55)]"
    >
      {(["before", "after"] as const).map((s) => {
        const active = s === side;
        const { image, date } = images[s];
        const pct = progressOf(image);
        const state =
          image.status === "ready"
            ? null
            : isLoading(image)
              ? pct
                ? `Loading ${Math.round(pct * 100)}%`
                : "Loading…"
              : "Not shown";
        return (
          <button
            key={s}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s)}
            className={`relative flex flex-1 flex-col items-start px-4 pb-2.5 pt-3 text-left transition-colors duration-75 focus-visible:-outline-offset-4 ${
              active ? "bg-ink text-paper" : "bg-sheet text-ink hover:bg-signal-wash"
            } ${s === "after" ? "border-l-[1.5px] border-ink" : ""}`}
          >
            {active ? <span aria-hidden className="absolute inset-x-0 top-0 h-[4px] bg-signal" /> : null}
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className="text-[17px] font-[680] leading-tight">{SIDE_LABEL[s]}</span>
              {active ? (
                <span className="text-[11px] font-[600] leading-tight text-signal">Showing</span>
              ) : null}
            </span>
            <span className={`num text-[14px] leading-snug ${active ? "text-paper" : "text-ink-2"}`}>{formatDateLong(date)}</span>
            {state ? (
              <span className={`num text-[11px] leading-snug ${active ? "text-[#c9d0d6]" : "text-ink-3"}`}>{state}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function LoadingBox({
  sides,
  images,
}: {
  sides: Side[];
  images: Record<Side, { image: BrowseImageState; date: IsoDate }>;
}) {
  return (
    <div
      role="status"
      className="pointer-events-auto w-[min(300px,calc(100vw-2rem))] rounded-[4px] bg-sheet px-3 py-2.5 text-[13px] leading-snug text-ink shadow-[0_0_0_1px_var(--color-rule)]"
    >
      <p className="mb-2">Downloading the radar {sides.length > 1 ? "images" : "image"} from NASA's archive</p>
      <div className="flex flex-col gap-2">
        {sides.map((s) => {
          const pct = progressOf(images[s].image);
          return (
            <div key={s} className="flex flex-col gap-1">
              <span className="num flex justify-between text-[12px] text-ink-2">
                <span>
                  {SIDE_LABEL[s]}, {formatDateLong(images[s].date)}
                </span>
                <span>{pct ? `${Math.round(pct * 100)}%` : ""}</span>
              </span>
              <ProgressBar value={pct ?? undefined} label={`Loading the ${s} image`} />
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-ink-3">Each image is 2 to 7 MB, so this can take a few seconds.</p>
    </div>
  );
}

/** When the area changes after the first render (another pair was chosen), frame it. */
function FitOnChange({ bbox }: { bbox?: BBox }) {
  const { current } = useMap();
  const key = bbox?.join(",");
  const firstKey = useRef(key);
  useEffect(() => {
    if (!current || !bbox || key === firstKey.current) return;
    firstKey.current = key;
    current.fitBounds(bboxToBounds(extendSouth(bbox, SWITCH_ROOM)), { padding: 24, duration: prefersReducedMotion() ? 0 : 900 });
    // Runs only when the pair's area changes (key), not on every new bbox array.
  }, [current, key]);
  return null;
}
