import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Pass } from "../../api/types";
import { paths } from "../../app/paths";
import { ErrorMessage, ProgressBar } from "../../ui/feedback";
import { formatBytes, formatDateLong, formatDayShort, plural } from "../../ui/format";
import { SectionTitle } from "../../ui/MapPageLayout";
import { directionExplained, MATURITY_TEXT, polarizationsExplained } from "./passText";
import { daysBetween, formatTimeUtc } from "./regionLogic";
import type { NeighborState } from "./useStackNeighbors";

interface Props {
  pass: Pass;
  previous: NeighborState;
  next: NeighborState;
  onBack: () => void;
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="border-b border-rule py-2 pr-3 text-ink-2">{term}</dt>
      <dd className="border-b border-rule py-2 text-ink">{children}</dd>
    </div>
  );
}

const compareBox =
  "flex flex-col gap-0.5 rounded-[4px] border border-rule bg-sheet px-3 py-2.5 transition-colors hover:border-ink";

function CompareOption({ pass, state, side }: { pass: Pass; state: NeighborState; side: "previous" | "next" }) {
  const word = side === "previous" ? "earlier" : "later";
  if (state.status === "found") {
    const other = state.pass;
    const days = Math.abs(daysBetween(pass.date, other.date));
    const [before, after] = side === "previous" ? [other, pass] : [pass, other];
    return (
      <Link to={paths.compare(before.id, after.id)} className={compareBox}>
        <span className="text-[15px] font-[650] text-ink">
          See before and after with {formatDayShort(other.date)}
        </span>
        <span className="num text-[13px] text-ink-2">
          {formatDateLong(before.date)} and {formatDateLong(after.date)}, {plural(days, "day", "days")} apart
        </span>
      </Link>
    );
  }
  if (state.status === "searching") {
    return (
      <div className="flex flex-col gap-1.5 py-1" role="status">
        <p className="text-[13px] text-ink-2">Looking for the {word} pass of this strip, just outside the chosen period…</p>
        <ProgressBar label={`Looking for the ${word} pass`} />
      </div>
    );
  }
  if (state.status === "error") return <ErrorMessage>{state.message}</ErrorMessage>;
  return (
    <p className="text-[13px] text-ink-3">
      No {word} pass of this strip on record within {side === "previous" ? "24 days before" : "24 days after"} the period.
    </p>
  );
}

/** Details of the selected pass in plain words, and before/after links within the same strip. */
export function PassDetails({ pass, previous, next, onBack }: Props) {
  const maturity = MATURITY_TEXT[pass.maturity];
  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onBack} className="link self-start text-[14px]">
        Back to the passes of {formatDayShort(pass.date)}
      </button>

      <div>
        <h2 id="pass-title" className="text-[20px] font-[650] leading-tight text-ink">
          Pass on {formatDateLong(pass.date)}
        </h2>
        <p className="num text-[14px] text-ink-2">at {formatTimeUtc(pass.start)}</p>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="compare-title">
        <SectionTitle id="compare-title">Before and after</SectionTitle>
        <p className="text-[14px] leading-snug text-ink-2">
          Compare this pass with the one before or after it in the same strip, normally 12 days apart.
        </p>
        <CompareOption pass={pass} state={previous} side="previous" />
        <CompareOption pass={pass} state={next} side="next" />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="about-title">
        <SectionTitle id="about-title">About this pass</SectionTitle>
        <dl className="grid grid-cols-[auto_1fr] border-t border-rule text-[14px] leading-snug">
          <Fact term="Date and time">
            <span className="num">
              {formatDateLong(pass.date)}, {formatTimeUtc(pass.start)}
            </span>
          </Fact>
          <Fact term="Direction">{directionExplained(pass.direction)}</Fact>
          <Fact term="Image strip">
            <span className="num font-[600]">{pass.stackId.replace(/_/g, "-")}</span>
            <span className="block text-[13px] text-ink-2">
              Track {pass.track}, frame {pass.frame}. Passes of the same strip see the ground from the same angle, every
              12 days, so only they can be compared.
            </span>
          </Fact>
          <Fact term="Polarizations">
            <span className="text-[13px]">{polarizationsExplained(pass.polarizations)}</span>
          </Fact>
          <Fact term="Data maturity">
            <span className="font-[600]">{maturity.label}</span>
            <span className="block text-[13px] text-ink-2">{maturity.note}</span>
          </Fact>
          <Fact term="Full product">
            <span className="num">{formatBytes(pass.sizeBytes)}</span>
            <span className="block text-[13px] text-ink-2">
              The full file needs a free{" "}
              <a href="https://urs.earthdata.nasa.gov/users/new" target="_blank" rel="noreferrer" className="link font-[500]">
                NASA Earthdata login
              </a>
              .{" "}
              <a href={pass.download} target="_blank" rel="noreferrer" className="link font-[500]">
                Download it
              </a>
            </span>
          </Fact>
          <Fact term="Quality report">
            <a href={pass.qaReport} target="_blank" rel="noreferrer" className="link font-[500]">
              Open the QA report (PDF)
            </a>
          </Fact>
        </dl>
      </section>
    </div>
  );
}
