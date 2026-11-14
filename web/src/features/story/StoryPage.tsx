// PLACEHOLDER: the story page is owned by the next agent. What is real here is the alignment check:
// it draws the "after" image of the first featured pair with BrowseImageLayer, positioned by georef.corners.
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Marker } from "react-map-gl/maplibre";
import { describeError } from "../../api/client";
import { useStory } from "../../api/hooks";
import type { StoryPlace } from "../../api/types";
import { paths } from "../../app/paths";
import { BaseMap } from "../../map/BaseMap";
import { BrowseImageLayer, useBrowseImage } from "../../map/BrowseImageLayer";
import { BrowseImageStatus } from "../../map/BrowseImageStatus";
import { ShorelineOverlay } from "../../map/layers";
import { ErrorMessage, ProgressBar, StaleNotice } from "../../ui/feedback";
import { formatDateLong } from "../../ui/format";
import { MapPageLayout, PageTitle, SectionTitle } from "../../ui/MapPageLayout";

function PlaceLabel({ place }: { place: StoryPlace }) {
  return (
    <Marker longitude={place.lon} latitude={place.lat} anchor="left" offset={[-4, 0]}>
      <span className="pointer-events-none flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full border-[1.5px] border-ink bg-signal" />
        <span className="place rounded-[2px] bg-sheet/85 px-1 text-[13px] leading-tight text-ink">{place.name}</span>
      </span>
    </Marker>
  );
}

export function StoryPage() {
  const { storyId } = useParams();
  const story = useStory(storyId);
  const pair = story.data?.pairs.find((p) => p.featured) ?? story.data?.pairs[0];
  const afterPassId = pair?.after.id;
  const image = useBrowseImage(afterPassId);
  const [showShoreline, setShowShoreline] = useState(true);
  const [opacity, setOpacity] = useState(1);

  if (story.isError) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <ErrorMessage onRetry={() => story.refetch()}>{describeError(story.error)}</ErrorMessage>
        <Link to={paths.overview()} className="link mt-4 inline-block">
          Back to the map
        </Link>
      </div>
    );
  }
  if (!story.data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <ProgressBar label="Loading the story" />
        <p className="mt-3 text-ink-2">Loading the story…</p>
      </div>
    );
  }

  const s = story.data;
  const initialBbox = pair?.browse?.after.georef?.bounds ?? s.region.bbox;

  const panel = (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <PageTitle>{s.title}</PageTitle>
        <p className="text-[15px] leading-[1.55] text-ink-2">{s.subtitle}</p>
        <p className="text-[13px] text-ink-3">Event on {formatDateLong(s.eventDate)}</p>
      </header>
      <StaleNotice dataSource={s.dataSource} />

      {pair ? (
        <section className="flex flex-col gap-3" aria-labelledby="check-title">
          <SectionTitle id="check-title">Image alignment check</SectionTitle>
          <p className="text-[14px] leading-[1.55] text-ink-2">
            The map shows the radar image from {formatDateLong(pair.after.date)}, the day after the event. Calm water is dark
            in radar, so the shores of Lake Guaíba and the channels of the Jacuí delta should sit on the yellow line, which is
            the basemap's water outline. Zoom in on Porto Alegre to compare.
          </p>
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={showShoreline}
              onChange={(e) => setShowShoreline(e.target.checked)}
              className="size-4 accent-ink"
            />
            Show the basemap's water outline
          </label>
          <label className="flex flex-col gap-1 text-[14px]">
            <span>Image opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="accent-ink"
            />
          </label>
          <dl className="num grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px] text-ink-2">
            <dt>Pass</dt>
            <dd className="break-all text-ink">{pair.after.id}</dd>
            {image.status === "ready" || image.status === "loading-image" ? (
              <>
                <dt>Fit error</dt>
                <dd className="text-ink">
                  {image.georef.rmsErrorPx.toFixed(2)} px, pixel aspect {image.georef.pixelAspect.toFixed(3)}, quality{" "}
                  {image.georef.quality}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : (
        <p className="text-ink-2">This story has no before and after pair yet.</p>
      )}

      <p className="border-t border-rule pt-4 text-[13px] text-ink-3">
        The full story page is being built. For now this page checks that radar images line up with the map.
      </p>
    </div>
  );

  return (
    <MapPageLayout
      panelLabel="Story"
      panel={panel}
      map={
        <BaseMap
          initialBbox={initialBbox}
          initialPadding={24}
          overlay={
            <div className="absolute left-3 top-3">
              <BrowseImageStatus image={image} />
            </div>
          }
        >
          <BrowseImageLayer image={image} opacity={opacity} />
          <ShorelineOverlay visible={showShoreline} />
          {s.places.map((p) => (
            <PlaceLabel key={p.name} place={p} />
          ))}
        </BaseMap>
      }
    />
  );
}
