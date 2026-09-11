import { ITEMGRAM_MAST, ORDER2, SALE2, PARTY_MAST, TODAY_ISO } from '../data/erpTables'
import { bandFor, DEFAULT_THRESHOLDS } from './thresholds'

const KG_PER_MT = 1000
const AXIS_CAP = 12 // safety cap - a family's sub-grade count stays well under this

// A grade in the dropdown is a commodity family; the chart plots that
// family's sub-grades (chemical variants), which is why there are only a
// handful of bars per selection - never all grades at once.
const GRADE_FAMILIES = [
  { key: 'HDPE', label: 'HDPE', codes: ['HDPEAP', 'HDPEA', 'HDPEB'] },
  { key: 'PVC', label: 'PVC', codes: ['PVCA', 'PVCBSTAR', 'PVCC'] },
  { key: 'PPGRAN', label: 'PP Gran', codes: ['PPGAP', 'PPGB', 'PPGC'] },
  { key: 'ABS', label: 'ABS', codes: ['ABSPEL', 'ABSREG'] },
  { key: 'LDPE', label: 'LDPE', codes: ['LDPEFILM'] },
  { key: 'PET', label: 'PET', codes: ['PETFLK'] },
  { key: 'NYLON', label: 'Nylon', codes: ['NYLCHIP'] },
]

export const PERIODS = {
  MTD: 'MTD',
  L12M: 'L12M',
}

export function getPeriodRange(period, todayIso = TODAY_ISO) {
  const today = new Date(todayIso)
  if (period === PERIODS.L12M) {
    const start = new Date(today.getFullYear(), today.getMonth() - 11, 1)
    return { start, end: today }
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { start, end: today }
}

// Parse "YYYY-MM-DD" as a local-midnight Date - the built-in Date(string)
// parser treats date-only strings as UTC, which drifts a day off `start`/
// `end` (both local) in any timezone ahead of UTC.
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function inRange(dateStr, start, end) {
  const d = parseLocalDate(dateStr)
  return d >= start && d <= end
}

function niceCeil(value) {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = magnitude / 2
  return Math.ceil(value / step) * step
}

export function getActiveGrades() {
  return ITEMGRAM_MAST.filter((g) => g.ACTIVE === 1)
}

/**
 * Aggregates ORDER2 (net of cancelled/adjusted qty) and SALE2 (STATUS = 1
 * only) into MT per grade for the given period, applying the same
 * active-flag, non-zero, and grade-cap rules the chart contract requires.
 */
export function computeGradeMetrics({
  period = PERIODS.MTD,
  familyKey = GRADE_FAMILIES[0].key,
  thresholds = DEFAULT_THRESHOLDS,
  todayIso = TODAY_ISO,
} = {}) {
  const { start, end } = getPeriodRange(period, todayIso)
  const family = GRADE_FAMILIES.find((f) => f.key === familyKey) ?? GRADE_FAMILIES[0]
  const activeGrades = getActiveGrades().filter((g) => family.codes.includes(g.CODE))

  let rows = activeGrades.map((grade) => {
    const demandKg = ORDER2.filter((o) => o.ITEM_CODE === grade.CODE && inRange(o.V_DATE, start, end)).reduce(
      (sum, o) => sum + (o.QTY - o.ADJ_QTY),
      0,
    )
    const salesKg = SALE2.filter(
      (s) => s.ITEM_CODE === grade.CODE && s.STATUS === 1 && inRange(s.V_DATE, start, end),
    ).reduce((sum, s) => sum + s.QTY, 0)

    const demandMT = demandKg / KG_PER_MT
    const salesMT = salesKg / KG_PER_MT
    const fulfilmentPct = demandMT > 0 ? (salesMT / demandMT) * 100 : salesMT > 0 ? 100 : 0

    return {
      code: grade.CODE,
      name: grade.NAME,
      demandMT: Math.round(demandMT * 10) / 10,
      salesMT: Math.round(salesMT * 10) / 10,
      gapMT: Math.round((demandMT - salesMT) * 10) / 10,
      fulfilmentPct: Math.round(fulfilmentPct * 10) / 10,
      band: bandFor(fulfilmentPct, thresholds),
    }
  })

  // "Only grades with non-zero demand or sales in the period"
  rows = rows.filter((r) => r.demandMT > 0 || r.salesMT > 0)

  rows.sort((a, b) => a.demandMT - b.demandMT)
  rows = rows.slice(0, AXIS_CAP)

  const maxBar = rows.reduce((max, r) => Math.max(max, r.demandMT, r.salesMT), 0)
  const yMax = niceCeil(maxBar * 1.15)

  return { rows, yMax }
}

export function getGradeFamilies() {
  return GRADE_FAMILIES.map(({ key, label }) => ({ key, label }))
}

export function getParties() {
  return PARTY_MAST
}


export function fetchPartyRateData(partyCode, gradeCode) {
  const xLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

  if (partyCode === 'P001' && gradeCode === 'HDPEAP') {
    return {
      xLabels,
      yValues: [118.0, 119.0, 119.0, 123.0, 124.0, 124.5],
    }
  }

  if (partyCode === 'P007' && gradeCode === 'ABSREG') {
    return {
      xLabels,
      yValues: [null, null, null, null, null, 142.0],
    }
  }

  if (partyCode === 'P005' && gradeCode === 'PVCA') {
    return {
      xLabels,
      yValues: [130.0, 131.5, 132.0, null, 134.0, 135.0],
    }
  }

  const partySeed = (partyCode || '').charCodeAt((partyCode || '').length - 1) || 1
  const gradeSeed = (gradeCode || '').charCodeAt((gradeCode || '').length - 1) || 1
  const baseRate = 100 + ((partySeed * 7 + gradeSeed * 13) % 50)

  const yValues = xLabels.map((_, i) => {
    const v = baseRate + i * 1.2 + Math.sin((i + partySeed) * 1.4) * 2.5
    return Math.round(v * 10) / 10
  })

  return { xLabels, yValues }
}


export function computePartyRateMetrics({ xLabels, yValues }) {
  const monthlyPoints = xLabels.map((label, idx) => ({
    monthLabel: label,
    rate: yValues[idx] ?? null,
  }))

  const validRates = yValues.filter((v) => v !== null && v !== undefined)

  if (validRates.length < 2) {
    return {
      insufficientHistory: true,
      monthlyPoints,
      mean: null,
      latestVsMean: null,
      momShift: null,
      prevMonthContext: null,
      yMin: 0,
      yMax: 100,
    }
  }

  const sum = validRates.reduce((acc, val) => acc + val, 0)
  const mean = Math.round((sum / validRates.length) * 10) / 10

  const latestRate = validRates[validRates.length - 1]
  const prevRate = validRates[validRates.length - 2]

  const latestVsMean = Math.round((latestRate - mean) * 10) / 10
  const momShift = Math.round((latestRate - prevRate) * 10) / 10

  const latestIdx = yValues.lastIndexOf(latestRate)
  const prevIdx = yValues.lastIndexOf(prevRate)
  const skipped = latestIdx - prevIdx > 1
  const prevMonthContext = skipped
    ? `Compared to ${xLabels[prevIdx]} (${xLabels[latestIdx - 1]} had no data)`
    : `Compared to ${xLabels[prevIdx]}`

  const allRates = validRates.concat(mean)
  const minRate = Math.min(...allRates)
  const maxRate = Math.max(...allRates)

  const yMin = Math.floor(minRate) - 2
  const yMax = Math.ceil(maxRate) + 2

  return {
    insufficientHistory: false,
    monthlyPoints,
    mean,
    latestVsMean,
    momShift,
    prevMonthContext,
    yMin,
    yMax,
  }
}



