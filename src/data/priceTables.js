// Dummy ERP data for the Sales / Production / Target price line chart.
// Mirrors the field-mapping spec's SALE2 (net sale value) and a production
// output table; kept separate from erpTables.js since the fields needed
// here (amounts, cost, margin) don't overlap with the demand/sales-MT chart.
import { ITEMGRAM_MAST, TODAY_ISO } from './erpTables'

function mulberry32(seed) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260911 + 17)

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate()
}

function toDateStr(y, m, day) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const [TODAY_Y, TODAY_M, TODAY_D] = TODAY_ISO.split('-').map(Number)
const TODAY = new Date(TODAY_Y, TODAY_M - 1, TODAY_D)
const MONTHS = []
{
  const cursor = new Date(TODAY.getFullYear(), TODAY.getMonth() - 15, 1)
  while (cursor <= TODAY) {
    MONTHS.push({ y: cursor.getFullYear(), m: cursor.getMonth() })
    cursor.setMonth(cursor.getMonth() + 1)
  }
}

// Grade master -> target margin % and an optional manual target price
// override (GRADE_MASTER -> TARGET_MARGIN_PCT, MANUAL_TARGET_PRICE).
// `behavior` only shapes the dummy generator below, not part of the schema.
const PRICE_PROFILE = {
  HDPEAP: { baseCost: 82, marginPct: 18, manualTarget: null, behavior: 'healthy' },
  HDPEA: { baseCost: 78, marginPct: 16, manualTarget: null, behavior: 'healthy' },
  HDPEB: { baseCost: 60, marginPct: 15, manualTarget: null, behavior: 'healthy' },
  PVCA: { baseCost: 95, marginPct: 14, manualTarget: 118, behavior: 'healthy' },
  PVCBSTAR: { baseCost: 88, marginPct: 12, manualTarget: null, behavior: 'critical' },
  PPGAP: { baseCost: 105, marginPct: 20, manualTarget: null, behavior: 'healthy' },
  PPGB: { baseCost: 99, marginPct: 17, manualTarget: null, behavior: 'healthy' },
  ABSPEL: { baseCost: 130, marginPct: 19, manualTarget: 168, behavior: 'healthy' },
  ABSREG: { baseCost: 70, marginPct: 15, manualTarget: null, behavior: 'healthy' },
  LDPEFILM: { baseCost: 75, marginPct: 16, manualTarget: null, behavior: 'healthy' },
  PETFLK: { baseCost: 55, marginPct: 13, manualTarget: null, behavior: 'warning' },
  NYLCHIP: { baseCost: 150, marginPct: 22, manualTarget: null, behavior: 'healthy' },
}

export const GRADE_PRICE_MASTER = Object.fromEntries(
  Object.entries(PRICE_PROFILE).map(([code, p]) => [
    code,
    { TARGET_MARGIN_PCT: p.marginPct, MANUAL_TARGET_PRICE: p.manualTarget },
  ]),
)

// PRODUCTION2 -> ITEM_CODE, V_DATE, QTY (produced KG), COST (total ₹), STATUS
export const PRODUCTION2 = []
// SALE2 (price lines) -> ITEM_CODE, V_DATE, QTY (dispatched KG), AMOUNT,
// DISC_AMT, PACK_AMT, STATUS (1 = Success, 2 = Cancel/draft)
export const SALE_PRICE_LINES = []

const activeCodes = new Set(ITEMGRAM_MAST.filter((g) => g.ACTIVE === 1).map((g) => g.CODE))

for (const [code, profile] of Object.entries(PRICE_PROFILE)) {
  if (!activeCodes.has(code)) continue
  let runningCost = profile.baseCost

  for (const { y, m } of MONTHS) {
    runningCost *= 1 + (0.005 + rand() * 0.01) // slow month-over-month cost drift
    const days = daysInMonth(y, m)
    const isCurrentMonth = y === TODAY.getFullYear() && m === TODAY.getMonth()

    for (let day = 1; day <= days; day++) {
      if (isCurrentMonth && day > TODAY.getDate()) break
      const dateStr = toDateStr(y, m, day)

      // Production - occasional gap day to exercise the carry-forward rule.
      if (rand() >= 0.15) {
        const dailyCostPerKg = runningCost * (0.96 + rand() * 0.08)
        const producedQtyKg = Math.round(800 + rand() * 400)
        PRODUCTION2.push({
          ITEM_CODE: code,
          V_DATE: dateStr,
          QTY: producedQtyKg,
          COST: Math.round(dailyCostPerKg * producedQtyKg),
          STATUS: 1,
        })
      }
      if (rand() < 0.03) {
        // A draft production entry that must be excluded by document status.
        PRODUCTION2.push({ ITEM_CODE: code, V_DATE: dateStr, QTY: 500, COST: Math.round(500 * runningCost), STATUS: 2 })
      }

      // Sales - deliberately shape a margin-compression window for the
      // "critical" grade, and a persistent cost/target squeeze for "warning".
      if (rand() >= 0.08) {
        const targetPerKg = runningCost * (1 + profile.marginPct / 100)
        let salesPerKg
        // Last ~6 elapsed days up to "today" - so MTD (which only covers
        // days 1..today) actually shows the squeeze developing, not a
        // window that hasn't happened yet within the current month.
        const inSqueezeWindow = isCurrentMonth && day > TODAY.getDate() - 6
        if (profile.behavior === 'critical' && inSqueezeWindow) {
          salesPerKg = runningCost * (0.85 + rand() * 0.1)
        } else if (profile.behavior === 'warning') {
          salesPerKg = runningCost * (1.02 + rand() * 0.05)
        } else {
          salesPerKg = targetPerKg * (0.97 + rand() * 0.1)
        }

        const dispatchedQtyKg = Math.round(600 + rand() * 500)
        const discAmt = Math.round(dispatchedQtyKg * salesPerKg * 0.03)
        const packAmt = Math.round(dispatchedQtyKg * salesPerKg * 0.01)
        // Net Amount = AMOUNT - DISC_AMT + PACK_AMT  ->  solve for AMOUNT.
        const amount = Math.round(dispatchedQtyKg * salesPerKg + discAmt - packAmt)

        SALE_PRICE_LINES.push({
          ITEM_CODE: code,
          V_DATE: dateStr,
          QTY: dispatchedQtyKg,
          AMOUNT: amount,
          DISC_AMT: discAmt,
          PACK_AMT: packAmt,
          STATUS: 1,
        })
      }
      if (rand() < 0.04) {
        // A cancelled sale line that must be excluded by document status.
        SALE_PRICE_LINES.push({
          ITEM_CODE: code,
          V_DATE: dateStr,
          QTY: 300,
          AMOUNT: Math.round(300 * runningCost),
          DISC_AMT: 0,
          PACK_AMT: 0,
          STATUS: 2,
        })
      }
    }
  }
}
