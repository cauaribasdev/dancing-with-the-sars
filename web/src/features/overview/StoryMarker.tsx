import { Link } from "react-router";
import { Marker } from "react-map-gl/maplibre";
import type { Region, StoryListItem, StoryPlace } from "../../api/types";
import { paths } from "../../app/paths";

/**
 * Map annotation pointing at the story: a signal-yellow dot on the place, a leader line,
 * and an ink tag with the title. It is a real link, so it is reachable with the keyboard.
 */
export function StoryMarker({ story, place, region }: { story: StoryListItem; place?: StoryPlace; region?: Region }) {
  const lon = place?.lon ?? (region ? (region.bbox[0] + region.bbox[2]) / 2 : undefined);
  const lat = place?.lat ?? (region ? (region.bbox[1] + region.bbox[3]) / 2 : undefined);
  if (lon === undefined || lat === undefined) return null;

  return (
    <Marker longitude={lon} latitude={lat} anchor="left" offset={[-7, 0]}>
      <Link
        to={paths.story(story.id)}
        className="group flex items-center rounded-[4px] focus-visible:outline-offset-4"
        aria-label={`Story: ${story.title}. See before and after.`}
      >
        <span aria-hidden className="size-3.5 shrink-0 rounded-full border-2 border-ink bg-signal" />
        <span aria-hidden className="h-[2px] w-6 bg-ink" />
        <span className="flex max-w-[210px] flex-col rounded-[4px] bg-ink px-2.5 py-1.5 text-left text-paper shadow-[0_4px_14px_-6px_rgb(22_32_42/0.6)] group-hover:bg-[#26323e]">
          <span className="text-[13px] font-[650] leading-tight">{story.title}</span>
          <span className="mt-0.5 text-[12px] leading-tight text-signal underline decoration-1 underline-offset-2">
            See before and after
          </span>
        </span>
      </Link>
    </Marker>
  );
}
