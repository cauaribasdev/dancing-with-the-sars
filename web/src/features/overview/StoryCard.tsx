import { Link } from "react-router";
import type { Story, StoryListItem } from "../../api/types";
import { paths } from "../../app/paths";
import { formatDateLong } from "../../ui/format";

/**
 * Way into the featured story from the panel. Title and subtitle come from /api/stories as they are.
 * Shows a small radar thumbnail (the "after" image of the first featured pair) once the story detail arrives.
 */
export function StoryCard({ story, detail }: { story: StoryListItem; detail?: Story }) {
  const featured = detail?.pairs.find((p) => p.featured && p.browse);
  const thumb = featured?.browse?.after.thumbnail;

  return (
    <section aria-labelledby="story-card-title" className="flex flex-col gap-3 border-t border-ink pt-4">
      <div className="flex gap-3.5">
        <div className="grid size-[84px] shrink-0 place-items-center overflow-hidden rounded-[3px] bg-radar-ground">
          {thumb ? (
            <img src={thumb} alt="" width={84} height={84} className="size-full object-contain" />
          ) : (
            <span aria-hidden className="size-3 rounded-full border-2 border-paper bg-signal" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="story-card-title" className="text-[17px] font-[650] leading-snug text-ink">
            {story.title}
          </h2>
          <p className="text-[13px] text-ink-3">Evento em {formatDateLong(story.eventDate)}</p>
          <p className="text-[12px] text-ink-3">Título e narrativa no idioma original (inglês).</p>
        </div>
      </div>
      <p className="text-[14px] leading-[1.55] text-ink-2">{story.subtitle}</p>
      <Link to={paths.story(story.id)} className="btn-primary self-start text-[15px]">
        Ver antes e depois
      </Link>
    </section>
  );
}
