// Story page: the narrative from /api/stories/:id on the left, the before/after viewer on the map.
// All story text is rendered as the API returns it.
import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { Marker, useMap } from "react-map-gl/maplibre";
import { describeError } from "../../api/client";
import { useStory } from "../../api/hooks";
import type { Story, StoryPair, StoryPlace } from "../../api/types";
import { regionNameInSentence } from "../../api/regionNames";
import { paths } from "../../app/paths";
import { BaseMap } from "../../map/BaseMap";
import { BeforeAfterMap } from "../../map/BeforeAfterMap";
import { describeGeometry } from "../../map/beforeAfter";
import { ErrorMessage, ProgressBar, StaleNotice } from "../../ui/feedback";
import { formatDateLong, plural } from "../../ui/format";
import { MapPageLayout, PageTitle, SectionTitle } from "../../ui/MapPageLayout";
import { featuredPairs, otherPairs, pairDates, pairFocus, pairKey, pairTiming, storyOpeningArea } from "./storyLogic";

interface PlaceTarget {
  place: StoryPlace;
  /** Changes on every choice, so choosing the same place again moves the map back to it. */
  nonce: number;
}

export function StoryPage() {
  const { storyId } = useParams();
  const story = useStory(storyId);
  const [chosenPair, setChosenPair] = useState<string>();
  const [target, setTarget] = useState<PlaceTarget>();

  if (story.isError) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <ErrorMessage onRetry={() => story.refetch()}>{describeError(story.error)}</ErrorMessage>
        <Link to={paths.overview()} className="link mt-4 inline-block">
          Voltar ao mapa
        </Link>
      </div>
    );
  }
  if (!story.data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <ProgressBar label="Carregando a história" />
        <p className="mt-3 text-ink-2">Carregando a história e as passagens do radar. Na primeira vez, pode levar alguns segundos.</p>
      </div>
    );
  }

  const s = story.data;
  const featured = featuredPairs(s);
  const pair = featured.find((p) => pairKey(p) === chosenPair) ?? featured[0];
  const openingArea = storyOpeningArea(s.places, s.region.bbox);
  const choosePlace = (place: StoryPlace) => setTarget({ place, nonce: Date.now() });

  const mapChildren = (
    <>
      {s.places.map((p) => (
        <PlaceMarker key={p.name} place={p} selected={target?.place.name === p.name} onChoose={choosePlace} />
      ))}
      <FlyToPlace target={target} />
    </>
  );

  const map = pair ? (
    <BeforeAfterMap
      before={{ passId: pair.before.id, date: pair.before.date }}
      after={{ passId: pair.after.id, date: pair.after.date }}
      initialBbox={openingArea}
      pairBbox={pairFocus(pair, openingArea)}
    >
      {mapChildren}
    </BeforeAfterMap>
  ) : (
    <BaseMap initialBbox={openingArea}>{mapChildren}</BaseMap>
  );

  return (
    <MapPageLayout
      panelLabel="História"
      map={map}
      panel={
        <StoryPanel
          story={s}
          featured={featured}
          pair={pair}
          onChoosePair={(p) => setChosenPair(pairKey(p))}
          selectedPlace={target?.place.name}
          onChoosePlace={choosePlace}
        />
      }
    />
  );
}

function StoryPanel({
  story: s,
  featured,
  pair,
  onChoosePair,
  selectedPlace,
  onChoosePlace,
}: {
  story: Story;
  featured: StoryPair[];
  pair: StoryPair | undefined;
  onChoosePair: (p: StoryPair) => void;
  selectedPlace: string | undefined;
  onChoosePlace: (p: StoryPlace) => void;
}) {
  const others = otherPairs(s);
  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-3">
        <PageTitle>{s.title}</PageTitle>
        <p className="text-[15px] leading-[1.55] text-ink-2">{s.subtitle}</p>
        <p className="text-[12px] text-ink-3">Narrativa e títulos das fontes em inglês, no idioma original.</p>
        <p className="text-[13px] text-ink-3">Evento em {formatDateLong(s.eventDate)}</p>
      </header>
      <StaleNotice dataSource={s.dataSource} />

      <p className="text-[15px] leading-[1.55] text-ink">{s.narrative.summary}</p>

      <section className="flex flex-col gap-3" aria-labelledby="pairs-title">
        <SectionTitle id="pairs-title">Antes e depois</SectionTitle>
        {pair ? (
          <>
            <p className="text-[14px] leading-[1.55] text-ink-2">
              Cada par reúne duas imagens de radar da mesma faixa, captadas da mesma posição orbital. Alterne
              entre elas no mapa para observar as diferenças.
            </p>
            {featured.length > 1 ? (
              <ul className="flex flex-col gap-1.5" aria-label="Pares de imagens">
                {featured.map((p) => (
                  <li key={pairKey(p)}>
                    <PairOption pair={p} selected={p === pair} onChoose={() => onChoosePair(p)} />
                  </li>
                ))}
              </ul>
            ) : (
              <PairSummary pair={pair} />
            )}
            <Link to={paths.compare(pair.before.id, pair.after.id)} className="link self-start text-[14px]">
              Detalhes destas duas passagens
            </Link>
          </>
        ) : (
          <p className="text-[14px] text-ink-2">Esta história ainda não tem um par de imagens antes e depois.</p>
        )}
      </section>

      <TextList title="O que observar" id="look-title" items={s.narrative.whatToLookFor} />

      {s.places.length > 0 ? (
        <section className="flex flex-col gap-2" aria-labelledby="places-title">
          <SectionTitle id="places-title">Locais</SectionTitle>
          <ul className="flex flex-col">
            {s.places.map((p) => (
              <li key={p.name}>
                <button
                  type="button"
                  onClick={() => onChoosePlace(p)}
                  aria-pressed={selectedPlace === p.name}
                  className={`flex w-full items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-left hover:bg-signal-wash ${
                    selectedPlace === p.name ? "bg-signal-wash" : ""
                  }`}
                >
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full border-[1.5px] border-ink bg-signal" />
                  <span className="place text-[16px] text-ink">{p.name}</span>
                  <span className="ml-auto text-[12px] text-ink-3">Ir até lá</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <TextList title="Por que aconteceu" id="why-title" items={s.narrative.physicalDrivers} />
      <TextList title="Importante saber" id="caveats-title" items={s.narrative.caveats} />

      {s.sources.length > 0 ? (
        <section className="flex flex-col gap-2" aria-labelledby="sources-title">
          <SectionTitle id="sources-title">Fontes</SectionTitle>
          <ul className="flex flex-col gap-2.5 text-[14px] leading-snug">
            {s.sources.map((src) => (
              <li key={src.url}>
                <a href={src.url} target="_blank" rel="noreferrer" className="link font-[500]">
                  {src.title}
                </a>
                <span className="block text-[12px] text-ink-3">{src.publisher}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="flex flex-col gap-2 border-t border-ink pt-4" aria-labelledby="others-title">
          <SectionTitle id="others-title">Outros pares do evento</SectionTitle>
          <p className="text-[13px] leading-snug text-ink-2">
            Outras faixas sobre {regionNameInSentence(s.region)}, com uma passagem antes e outra depois de {formatDateLong(s.eventDate)}. Cada par abre em
            sua própria página.
          </p>
          <ul className="flex flex-col divide-y divide-rule border-y border-rule">
            {others.map((p) => (
              <li key={pairKey(p)}>
                <Link
                  to={paths.compare(p.before.id, p.after.id)}
                  className="group flex items-baseline justify-between gap-3 px-1 py-1.5 hover:bg-signal-wash"
                >
                  <span className="num text-[14px] font-[600] text-ink underline decoration-rule-strong underline-offset-[3px] group-hover:decoration-ink">
                    {pairDates(p)}
                  </span>
                  <span className="num text-[12px] text-ink-3">{describeGeometry(p)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PairOption({ pair, selected, onChoose }: { pair: StoryPair; selected: boolean; onChoose: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onChoose}
      className={`flex w-full flex-col gap-0.5 rounded-[3px] border-l-[3px] px-3 py-2 text-left ${
        selected ? "border-ink bg-signal-wash" : "border-transparent hover:bg-signal-wash/60"
      }`}
    >
      <PairText pair={pair} />
    </button>
  );
}

function PairSummary({ pair }: { pair: StoryPair }) {
  return (
    <div className="flex flex-col gap-0.5 border-l-[3px] border-ink bg-signal-wash px-3 py-2">
      <PairText pair={pair} />
    </div>
  );
}

function PairText({ pair }: { pair: StoryPair }) {
  return (
    <>
      <span className="num text-[15px] font-[650] text-ink">{pairDates(pair)}</span>
      <span className="text-[13px] leading-snug text-ink-2">{pairTiming(pair)}</span>
      {pair.placesCovered.length > 0 ? (
        <span className="text-[13px] leading-snug text-ink-2">
          Mostra{" "}
          {pair.placesCovered.map((name, i) => (
            <span key={name}>
              {i > 0 ? (i === pair.placesCovered.length - 1 ? " e " : ", ") : null}
              <span className="place text-ink">{name}</span>
            </span>
          ))}
        </span>
      ) : null}
      <span className="num text-[12px] text-ink-3">
        {describeGeometry(pair)}, com intervalo de {plural(pair.daysApart, "dia", "dias")}
      </span>
    </>
  );
}

function TextList({ title, id, items }: { title: string; id: string; items: string[] }): ReactNode {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby={id}>
      <SectionTitle id={id}>{title}</SectionTitle>
      <ul className="flex list-disc flex-col gap-2 pl-4 text-[14px] leading-[1.55] text-ink-2 marker:text-ink-3">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

/** Signal-yellow dot with an ink ring and a serif italic label. A button: choosing it moves the map there. */
function PlaceMarker({
  place,
  selected,
  onChoose,
}: {
  place: StoryPlace;
  selected: boolean;
  onChoose: (p: StoryPlace) => void;
}) {
  return (
    <Marker longitude={place.lon} latitude={place.lat} anchor="left" offset={[-6, 0]}>
      <button
        type="button"
        onClick={() => onChoose(place)}
        aria-label={`Ir para ${place.name}`}
        className="flex items-center gap-1.5 rounded-[3px] focus-visible:outline-offset-2"
      >
        <span
          aria-hidden
          className={`shrink-0 rounded-full border-2 border-ink bg-signal ${selected ? "size-3.5" : "size-3"}`}
        />
        <span
          className={`place rounded-[2px] px-1 text-[14px] leading-tight text-ink ${selected ? "bg-signal-wash" : "bg-sheet/90"}`}
        >
          {place.name}
        </span>
      </button>
    </Marker>
  );
}

function FlyToPlace({ target }: { target: PlaceTarget | undefined }) {
  const { current } = useMap();
  useEffect(() => {
    if (!current || !target) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    current.flyTo({
      center: [target.place.lon, target.place.lat],
      zoom: Math.max(current.getZoom(), 10.5),
      duration: reduced ? 0 : 900,
    });
  }, [current, target]);
  return null;
}
