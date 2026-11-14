export interface StoryPlace {
  name: string;
  lon: number;
  lat: number;
}

export interface StorySource {
  title: string;
  publisher: string;
  url: string;
}

/**
 * A curated "story": a region + event date + narrative. The NISAR passes and
 * before/after pairs are NOT hardcoded - they are resolved live from CMR.
 */
export interface StoryDefinition {
  id: string;
  title: string;
  subtitle: string;
  regionId: string;
  /** First day of the event (YYYY-MM-DD). Passes on/after this date count as "after". */
  eventDate: string;
  window: { start: string; end: string };
  /** Places of interest; pairs whose before+after footprints cover one are marked as featured. */
  places: StoryPlace[];
  narrative: {
    summary: string;
    whatToLookFor: string[];
    physicalDrivers: string[];
    caveats: string[];
  };
  sources: StorySource[];
}
