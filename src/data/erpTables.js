// Dummy ERP data, shaped like the source tables in the field-mapping spec.
// Real integration would replace this module with queries against:
//   ITEMGRAM_MAST, ORDER2, SALE2, ITEM_MAST
// Quantities are generated in KG (matching ITEM_MAST -> UNIT_NAME) and
// converted to MT only at the aggregation layer (src/lib/metrics.js).

// Deterministic PRNG so the dummy dataset is stable across reloads.
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
const rand = mulberry32(20260911)

// ITEMGRAM_MAST -> CODE, NAME, ACTIVE (1 = active, 0 = inactive/discontinued)
export const ITEMGRAM_MAST = [
  { CODE: 'HDPEAP', NAME: 'HDPE A+', ACTIVE: 1 },
  { CODE: 'HDPEA', NAME: 'HDPE A', ACTIVE: 1 },
  { CODE: 'HDPEB', NAME: 'HDPE B', ACTIVE: 1 },
  { CODE: 'PVCA', NAME: 'PVC A', ACTIVE: 1 },
  { CODE: 'PVCBSTAR', NAME: 'PVC B*', ACTIVE: 1 },
  { CODE: 'PVCC', NAME: 'PVC C', ACTIVE: 0 }, // discontinued -> must stay off the axis
  { CODE: 'PPGAP', NAME: 'PP Gran A+', ACTIVE: 1 },
  { CODE: 'PPGB', NAME: 'PP Gran B', ACTIVE: 1 },
  { CODE: 'PPGC', NAME: 'PP Gran C', ACTIVE: 1 }, // active but no transactions -> excluded by the non-zero rule
  { CODE: 'ABSPEL', NAME: 'ABS Pellets', ACTIVE: 1 },
  { CODE: 'ABSREG', NAME: 'ABS Regrind', ACTIVE: 1 },
  { CODE: 'LDPEFILM', NAME: 'LDPE Film', ACTIVE: 1 },
  { CODE: 'PETFLK', NAME: 'PET Flakes', ACTIVE: 1 },
  { CODE: 'NYLCHIP', NAME: 'Nylon Chips', ACTIVE: 1 },
]

// ITEM_MAST -> UNIT_NAME (all grades transact in KG in this ERP)
export const ITEM_MAST = Object.fromEntries(
  ITEMGRAM_MAST.map((g) => [g.CODE, { UNIT_NAME: 'KG' }]),
)

// Per-grade monthly baseline (MT) and target fulfilment band, used only to
// shape the dummy generator below - not part of the real schema.
const GRADE_PROFILE = {
  HDPEAP: { baseline: 430, fulfilment: 0.97 },
  HDPEA: { baseline: 460, fulfilment: 0.96 },
  HDPEB: { baseline: 260, fulfilment: 0.94 },
  PVCA: { baseline: 480, fulfilment: 0.88 },
  PVCBSTAR: { baseline: 500, fulfilment: 0.58 },
  PPGAP: { baseline: 520, fulfilment: 0.98 },
  PPGB: { baseline: 545, fulfilment: 0.95 },
  ABSPEL: { baseline: 560, fulfilment: 0.99 },
  ABSREG: { baseline: 240, fulfilment: 0.97 },
  LDPEFILM: { baseline: 300, fulfilment: 0.96 },
  PETFLK: { baseline: 340, fulfilment: 0.79 },
  NYLCHIP: { baseline: 210, fulfilment: 0.89 },
  // PPGC intentionally omitted -> zero demand and zero sales, every month
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate()
}

// Local calendar date as YYYY-MM-DD - Date#toISOString() converts to UTC
// first, which silently shifts the date in any timezone ahead of UTC.
function toDateStr(y, m, day) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Generate 16 months of history, ending at "today" (2026-09-11), so both the
// MTD and Last 12 Month periods have full coverage plus lookback headroom.
const TODAY = new Date(2026, 8, 11) // 2026-09-11
const MONTHS = []
{
  const cursor = new Date(TODAY.getFullYear(), TODAY.getMonth() - 15, 1)
  while (cursor <= TODAY) {
    MONTHS.push({ y: cursor.getFullYear(), m: cursor.getMonth() })
    cursor.setMonth(cursor.getMonth() + 1)
  }
}

export const TODAY_ISO = toDateStr(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())

// ORDER2 -> ITEM_CODE, QTY, ADJ_QTY, V_DATE (net demand = QTY - ADJ_QTY)
export const ORDER2 = []
// SALE2 -> ITEM_CODE, QTY, V_DATE, STATUS (1 = Success, 2 = Cancel)
export const SALE2 = []


export const PARTY_MAST = [
  { CODE: 'P001', NAME: 'Reliance Infra' },
  { CODE: 'P002', NAME: 'Tata Chemicals' },
  { CODE: 'P003', NAME: 'Supreme Industries' },
  { CODE: 'P004', NAME: 'Astral Pipes' },
  { CODE: 'P005', NAME: 'Finolex Industries' },
  { CODE: 'P006', NAME: 'Pidilite Industries' },
  { CODE: 'P007', NAME: 'Havells India' },
  { CODE: 'P008', NAME: 'Jain Irrigation' },
]

// Rows are generated per calendar day (not just a few per month) so that a
// partial period like MTD samples enough of both tables to preserve the
// intended demand/fulfilment ratio - a handful of random monthly rows would
// make MTD wildly noisy since demand and sales dates are independent draws.
for (const [code, profile] of Object.entries(GRADE_PROFILE)) {
  for (const { y, m } of MONTHS) {
    const monthVariance = 0.85 + rand() * 0.3
    const monthDemandMT = profile.baseline * monthVariance
    const monthFulfilment = Math.min(1.03, Math.max(0.7, profile.fulfilment * (0.95 + rand() * 0.1)))

    const days = daysInMonth(y, m)
    const dailyDemandMT = monthDemandMT / days
    const dailySalesMT = dailyDemandMT * monthFulfilment

    for (let day = 1; day <= days; day++) {
      const dateStr = toDateStr(y, m, day)

      const qtyKg = Math.round(dailyDemandMT * 1000 * (0.7 + rand() * 0.6))
      const adjQtyKg = rand() < 0.15 ? Math.round(qtyKg * rand() * 0.05) : 0
      ORDER2.push({ ITEM_CODE: code, QTY: qtyKg, ADJ_QTY: adjQtyKg, V_DATE: dateStr })

      SALE2.push({
        ITEM_CODE: code,
        QTY: Math.round(dailySalesMT * 1000 * (0.8 + rand() * 0.4)),
        V_DATE: dateStr,
        STATUS: 1,
      })

      // A cancelled order occasionally sits in SALE2 too - must be excluded by STATUS.
      if (rand() < 0.05) {
        SALE2.push({
          ITEM_CODE: code,
          QTY: Math.round(dailyDemandMT * 1000 * rand() * 0.5),
          V_DATE: dateStr,
          STATUS: 2,
        })
      }
    }
  }
}
