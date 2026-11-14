// PLACEHOLDER: the region page is owned by the next agent.
// URL: /region/:regionId?start=YYYY-MM-DD&end=YYYY-MM-DD (start/end optional, see app/paths.ts).
import { Link, useParams, useSearchParams } from "react-router";
import { isIsoDate } from "../../api/dates";
import { useRegions } from "../../api/hooks";
import { regionName } from "../../api/regionNames";
import { paths } from "../../app/paths";
import { BaseMap } from "../../map/BaseMap";
import { formatDayRange } from "../../ui/format";
import { MapPageLayout, PageTitle } from "../../ui/MapPageLayout";

export function RegionPage() {
  const { regionId } = useParams();
  const [params] = useSearchParams();
  const start = params.get("start");
  const end = params.get("end");
  const regions = useRegions();
  const region = regions.data?.find((r) => r.id === regionId);

  const panel = (
    <div className="flex flex-col gap-4">
      <PageTitle>{region ? regionName(region) : regionId}</PageTitle>
      {isIsoDate(start) && isIsoDate(end) ? (
        <p className="text-ink-2">Period: {formatDayRange(start, end)}</p>
      ) : null}
      {regions.data && !region ? <p className="text-ink-2">This region does not exist.</p> : null}
      <p className="text-[14px] text-ink-3">The list of passes for this region is being built.</p>
      <Link to={paths.overview({ region: regionId })} className="link self-start">
        Back to the map of Brazil
      </Link>
    </div>
  );

  return (
    <MapPageLayout
      panelLabel="Region"
      panel={panel}
      map={region ? <BaseMap key={region.id} initialBbox={region.bbox} initialPadding={48} /> : <BaseMap />}
    />
  );
}
