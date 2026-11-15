import { daysInclusive, isIsoDate, toIsoDate } from '../../api/dates';

/** Canonical state URL. Selection IDs are opaque, dates are UTC days. */
export function normalizeRegionQuery(input: URLSearchParams, today: Date): {params: URLSearchParams; warning: boolean} {
  const params = new URLSearchParams(input);
  const todayIso = toIsoDate(today);
  const defaultStart = toIsoDate(new Date(Date.parse(todayIso + 'T00:00:00Z') - 29 * 86400000));
  let warning = false;
  const tab = params.get('tab');
  if (tab === null) params.set('tab', params.has('day') || params.has('pass') ? 'radar' : 'overview');
  else if (!['overview', 'radar', 'alerts', 'help', 'posts'].includes(tab)) {
    params.set('tab', 'overview');
    warning = true;
  }
  const start = params.get('start');
  const end = params.get('end');
  const valid = isIsoDate(start) && isIsoDate(end) && start <= end && end <= todayIso && daysInclusive({start,end}) <= 366;
  if (!valid) {
    if (start !== null || end !== null) {
      warning = true;
      params.delete('day');
      params.delete('pass');
    }
    params.set('start', defaultStart);
    params.set('end', todayIso);
  }
  const day = params.get('day');
  if (day !== null && (!isIsoDate(day) || day < params.get('start')! || day > params.get('end')!)) {
    params.delete('day');
    params.delete('pass');
    warning = true;
  }
  return {params, warning};
}
