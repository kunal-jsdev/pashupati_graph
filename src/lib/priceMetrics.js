import { ITEMGRAM_MAST, TODAY_ISO } from '../data/erpTables'
import { GRADE_PRICE_MASTER, PRODUCTION2, SALE_PRICE_LINES } from '../data/priceTables'

export const PRICE_PERIODS = {
  MTD: 'MTD',
  L12M: 'L12M',
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function niceCeil(value) {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = magnitude / 2
  return Math.ceil(value / step) * step
}

export function getPriceGrades() {
  return ITEMGRAM_MAST.filter((g) => g.ACTIVE === 1 && GRADE_PRICE_MASTER[g.CODE]).map((g) => ({
    code: g.CODE,
    name: g.NAME,
  }))
}

// One bucket per day (MTD) or per calendar month (Last 12 Month), oldest first.
function buildBuckets(period, todayIso) {
  const [y, m, d] = todayIso.split('-').map(Number)
  const today = new Date(y, m - 1, d)

  if (period === PRICE_PERIODS.L12M) {
    const buckets = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)
      buckets.push({
        label: `${MONTH_SHORT[monthStart.getMonth()]} ${String(monthStart.getFullYear()).slice(2)}`,
        start: monthStart,
        end: monthEnd,
      })
    }
    return buckets
  }

  const buckets = []
  for (let day = 1; day <= today.getDate(); day++) {
    const date = new Date(today.getFullYear(), today.getMonth(), day)
    buckets.push({ label: `${day} ${MONTH_SHORT[date.getMonth()]}`, start: date, end: date })
  }
  return buckets
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function inBucket(dateStr, bucket) {
  const d = parseLocalDate(dateStr)
  return d >= bucket.start && d <= bucket.end
}

/**
 * Aggregates production and sale lines into ₹/KG per bucket for one grade,
 * applying the carry-forward rule for production cost and the point-flag
 * rules for sales price, per the Sales-Production-Target-Price spec.
 */
export function computeSalesProductionTarget({ period = PRICE_PERIODS.MTD, gradeCode, todayIso = TODAY_ISO } = {}) {
  const master = GRADE_PRICE_MASTER[gradeCode]
  const buckets = buildBuckets(period, todayIso)

  let lastKnownCost = null
  let lastKnownCostLabel = null

  const points = buckets.map((bucket) => {
    const productionRows = PRODUCTION2.filter(
      (p) => p.ITEM_CODE === gradeCode && p.STATUS === 1 && inBucket(p.V_DATE, bucket),
    )
    const producedQty = productionRows.reduce((sum, p) => sum + p.QTY, 0)
    const rawCost = producedQty > 0 ? productionRows.reduce((sum, p) => sum + p.COST, 0) / producedQty : null

    let productionCost = rawCost
    let carriedForward = false
    let carriedFromLabel = null
    if (rawCost !== null) {
      lastKnownCost = rawCost
      lastKnownCostLabel = bucket.label
    } else if (lastKnownCost !== null) {
      // Carry forward from the last bucket that actually had production -
      // not from the previous (possibly already carried-forward) point, so
      // a run of gap buckets all point back to the same original date.
      productionCost = lastKnownCost
      carriedForward = true
      carriedFromLabel = lastKnownCostLabel
    }

    const saleRows = SALE_PRICE_LINES.filter(
      (s) => s.ITEM_CODE === gradeCode && s.STATUS === 1 && inBucket(s.V_DATE, bucket),
    )
    const dispatchedQty = saleRows.reduce((sum, s) => sum + s.QTY, 0)
    const netSaleValue = saleRows.reduce((sum, s) => sum + (s.AMOUNT - s.DISC_AMT + s.PACK_AMT), 0)
    const salesPrice = dispatchedQty > 0 ? netSaleValue / dispatchedQty : null

    let targetPrice = null
    if (master?.MANUAL_TARGET_PRICE != null) {
      targetPrice = master.MANUAL_TARGET_PRICE
    } else if (productionCost !== null && master?.TARGET_MARGIN_PCT != null) {
      targetPrice = productionCost * (1 + master.TARGET_MARGIN_PCT / 100)
    }

    let flag = null
    if (salesPrice !== null && productionCost !== null) {
      if (salesPrice < productionCost) flag = 'critical'
      else if (targetPrice !== null && salesPrice < targetPrice) flag = 'warning'
      else flag = 'healthy'
    }

    const marginRs = salesPrice !== null && productionCost !== null ? salesPrice - productionCost : null
    const marginPct = marginRs !== null && salesPrice ? (marginRs / salesPrice) * 100 : null
    const targetGap = salesPrice !== null && targetPrice !== null ? salesPrice - targetPrice : null

    return {
      label: bucket.label,
      salesPrice: salesPrice !== null ? round1(salesPrice) : null,
      productionCost: productionCost !== null ? round1(productionCost) : null,
      targetPrice: targetPrice !== null ? round1(targetPrice) : null,
      flag,
      carriedForward,
      carriedFromLabel,
      marginRs: marginRs !== null ? round1(marginRs) : null,
      marginPct: marginPct !== null ? round1(marginPct) : null,
      targetGap: targetGap !== null ? round1(targetGap) : null,
    }
  })

  const allValues = points.flatMap((p) => [p.salesPrice, p.productionCost, p.targetPrice]).filter((v) => v !== null)
  const maxValue = allValues.length ? Math.max(...allValues) : 0
  const yMax = niceCeil(maxValue * 1.15)

  return { points, yMax }
}

function round1(v) {
  return Math.round(v * 10) / 10
}
