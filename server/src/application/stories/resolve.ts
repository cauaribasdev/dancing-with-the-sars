import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import type { MultiPolygon, Polygon } from 'geojson';
import { summarize, timeline } from '../../domain/coverage';
import { DomainError } from '../../domain/errors';
import { bracketingPairs } from '../../domain/pairs';
import type { Pass } from '../../domain/pass';
import type { StoryPlace } from '../../domain/story';
import { mapLimit } from '../../shared/async';
import { findRegionPasses } from '../passes';
import type { BrowseInfo, Deps } from '../ports';
import { STORIES } from './definitions';

const covers = (geom: Polygon | MultiPolygon, pl: StoryPlace) => booleanPointInPolygon([pl.lon, pl.lat], geom);

/** Georeference without failing the whole story if one PNG can't be fetched. */
async function safeBrowse(deps: Deps, pass: Pass): Promise<BrowseInfo> {
  try {
    return await deps.browse.describe(pass);
  } catch (err) {
    console.warn(`[story] browse georef failed for ${pass.id}: ${(err as Error).message}`);
    return { passId: pass.id, url: pass.browse.latlon, thumbnail: pass.browse.thumbnail, georef: null };
  }
}

export function listStories() {
  return STORIES.map(({ id, title, subtitle, regionId, eventDate, window }) => ({
    id,
    title,
    subtitle,
    regionId,
    eventDate,
    window,
  }));
}

/** Story definition + live NISAR data: passes in the window and before/after pairs around the event. */
export async function resolveStory(deps: Deps, id: string) {
  const def = STORIES.find((s) => s.id === id);
  if (!def) throw new DomainError('not_found', 'story_not_found', `Unknown story "${id}". See GET /api/stories.`);

  const { region, passes, source } = await findRegionPasses(deps, def.regionId, { ...def.window, product: 'GCOV' });

  const ranked = bracketingPairs(passes, def.eventDate, { maxDaysBefore: 21, maxDaysAfter: 14 })
    .map((p) => {
      const placesCovered = def.places
        .filter((pl) => covers(p.before.footprint, pl) && covers(p.after.footprint, pl))
        .map((pl) => pl.name);
      return { ...p, placesCovered, featured: placesCovered.length > 0 };
    })
    .sort((a, b) => Number(b.featured) - Number(a.featured));

  // Featured pairs ship with georeferenced browse images so the map can show them right away.
  const pairs = await mapLimit(ranked, 4, async (p) => {
    if (!p.featured) return { ...p, browse: null };
    const [before, after] = await Promise.all([safeBrowse(deps, p.before), safeBrowse(deps, p.after)]);
    return { ...p, browse: { before, after } };
  });

  return {
    ...def,
    region,
    dataSource: source,
    summary: summarize(passes),
    timeline: timeline(passes),
    pairs,
    passes,
  };
}
