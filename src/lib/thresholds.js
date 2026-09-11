// Fulfilment banding thresholds. These are business-cycle knobs, not
// constants baked into the aggregation logic - callers pass overrides
// through the UI (see ThresholdSettings in DemandVsSalesChart) rather than
// editing this file. Values are "fulfilment % and above".
export const DEFAULT_THRESHOLDS = {
  wellServed: 95,
  watch: 85,
}

export function bandFor(fulfilmentPct, thresholds = DEFAULT_THRESHOLDS) {
  if (fulfilmentPct >= thresholds.wellServed) return 'well-served'
  if (fulfilmentPct >= thresholds.watch) return 'watch'
  return 'under-served'
}
