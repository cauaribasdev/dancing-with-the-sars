// PLACEHOLDER: the compare page is owned by the next agent.
// URL: /compare?before=<passId>&after=<passId> (build it with paths.compare). Both passes must share a stackId.
import { Link, useSearchParams } from "react-router";
import { paths } from "../../app/paths";
import { BaseMap } from "../../map/BaseMap";
import { MapPageLayout, PageTitle } from "../../ui/MapPageLayout";

export function ComparePage() {
  const [params] = useSearchParams();
  const before = params.get("before");
  const after = params.get("after");

  const panel = (
    <div className="flex flex-col gap-4">
      <PageTitle>Before and after</PageTitle>
      {before && after ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px] text-ink-2">
          <dt>Before</dt>
          <dd className="break-all text-ink">{before}</dd>
          <dt>After</dt>
          <dd className="break-all text-ink">{after}</dd>
        </dl>
      ) : (
        <p className="text-ink-2">Pick two passes of the same place to compare them.</p>
      )}
      <p className="text-[14px] text-ink-3">The before and after comparison is being built.</p>
      <Link to={paths.overview()} className="link self-start">
        Back to the map
      </Link>
    </div>
  );

  return <MapPageLayout panelLabel="Comparison" panel={panel} map={<BaseMap />} />;
}
