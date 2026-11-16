import { consecutivePairs } from './pairs';
import type { Pass } from './pass';
import type { StoryDefinition } from './story';

export type AutomaticPostLink =
  | { page: 'region'; regionId: string; tab: 'radar'; day: string }
  | { page: 'compare'; before: string; after: string }
  | { page: 'story'; storyId: string };

export interface AutomaticPost {
  id: string;
  kind: 'pass' | 'pair' | 'story';
  date: string;
  title: string;
  text: string;
  link: AutomaticPostLink;
}

type StoryPostSource = Pick<StoryDefinition, 'id' | 'title' | 'subtitle' | 'regionId' | 'eventDate'>;

const kindOrder: Record<AutomaticPost['kind'], number> = { pass: 0, pair: 1, story: 2 };

/** Builds deterministic feed items from catalog passes and curated stories. */
export function generatePosts(regionId: string, passes: Pass[], stories: StoryPostSource[]): AutomaticPost[] {
  const posts: AutomaticPost[] = [];
  const passesByDate = new Map<string, Pass[]>();

  for (const pass of passes) {
    const dayPasses = passesByDate.get(pass.date) ?? [];
    dayPasses.push(pass);
    passesByDate.set(pass.date, dayPasses);
  }

  for (const [date, dayPasses] of passesByDate) {
    const strips = [...new Set(dayPasses.map((pass) => `${String(pass.track).padStart(3, '0')}-${pass.direction === 'descending' ? 'D' : 'A'}-${String(pass.frame).padStart(3, '0')}`))].sort();
    const count = dayPasses.length;
    posts.push({
      id: `pass-day:${regionId}:${date}`,
      kind: 'pass',
      date,
      title: `${count} ${count === 1 ? 'passagem' : 'passagens'} NISAR em ${date}`,
      text: `${count} ${count === 1 ? 'aquisição' : 'aquisições'} no dia, nas faixas ${strips.join(', ')}.`,
      link: { page: 'region', regionId, tab: 'radar', day: date },
    });
  }

  for (const pair of consecutivePairs(passes)) {
    posts.push({
      id: `pair:${pair.stackId}:${pair.before.date}:${pair.after.date}:${pair.before.id}:${pair.after.id}`,
      kind: 'pair',
      date: pair.after.date,
      title: `Par compatível na faixa ${pair.track}-${pair.direction === 'descending' ? 'D' : 'A'}-${pair.frame}`,
      text: `Duas passagens na mesma geometria, separadas por ${pair.daysApart} dias: ${pair.before.date} e ${pair.after.date}. Comparação visual, sem detecção automática.`,
      link: { page: 'compare', before: pair.before.id, after: pair.after.id },
    });
  }

  for (const story of stories) {
    if (story.regionId !== regionId) continue;
    posts.push({
      id: `story:${story.id}`,
      kind: 'story',
      date: story.eventDate,
      title: story.title,
      text: story.subtitle,
      link: { page: 'story', storyId: story.id },
    });
  }

  return posts.sort((a, b) =>
    b.date.localeCompare(a.date) || kindOrder[a.kind] - kindOrder[b.kind] || a.id.localeCompare(b.id),
  );
}
