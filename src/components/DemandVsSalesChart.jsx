import { useMemo, useRef, useState, useEffect } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { computeGradeMetrics, getGradeFamilies, PERIODS } from '../lib/metrics'
import { DEFAULT_THRESHOLDS } from '../lib/thresholds'

const DEMAND_COLOR = 'var(--demand-color)'
const SALES_COLOR = 'var(--sales-color)'
const WATCH_AMBER = 'var(--watch-amber)'
const UNDER_SERVED_RED = 'var(--under-served-red)'
const INK_SECONDARY = 'var(--ink-secondary)'

function GradeSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = options.find((o) => o.key === value)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300"
      >
        {current?.label ?? 'Select grade'}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 max-h-60 w-40 overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onChange(opt.key)
                setOpen(false)
              }}
              className={
                'block w-full rounded-lg px-3 py-1.5 text-left text-sm ' +
                (opt.key === value ? 'bg-emerald-50 font-medium text-emerald-800' : 'text-gray-700 hover:bg-gray-50')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PeriodToggle({ period, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-0.5 text-sm">
      {[
        { key: PERIODS.MTD, label: 'MTD' },
        { key: PERIODS.L12M, label: 'Last 12 Month' },
      ].map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={
            'rounded-full px-3 py-1.5 font-medium transition-colors ' +
            (period === opt.key
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900')
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function GradeTick({ x, y, payload, rowsByName }) {
  const row = rowsByName.get(payload.value)
  const underServed = row?.band === 'under-served'
  return (
    <g transform={`translate(${x},${y})`}>
      {underServed && (
        <text x={4} y={9} textAnchor="middle" fontSize={11} fill={UNDER_SERVED_RED}>
          ▲
        </text>
      )}
      <text
        x={0}
        y={22}
        textAnchor="middle"
        fontSize={12}
        fontWeight={underServed ? 700 : 400}
        fill={underServed ? UNDER_SERVED_RED : INK_SECONDARY}
      >
        {payload.value}
      </text>
    </g>
  )
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  const gapLine = (
    <div
      className="font-semibold"
      style={{ color: row.band === 'under-served' ? UNDER_SERVED_RED : WATCH_AMBER }}
    >
      Gap: {row.gapMT.toFixed(1)} MT unsold demand
    </div>
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-gray-900">{row.name}</div>
      {row.band === 'under-served' && gapLine}
      <div className="text-gray-600">Demand: {row.demandMT.toFixed(1)} MT</div>
      <div className="text-gray-600">Sales: {row.salesMT.toFixed(1)} MT</div>
      {row.band === 'watch' && gapLine}
      <div className="mt-1 text-gray-400">Fulfilment: {row.fulfilmentPct.toFixed(1)}%</div>
    </div>
  )
}

export default function DemandVsSalesChart() {
  const gradeFamilies = useMemo(() => getGradeFamilies(), [])
  const [period, setPeriod] = useState(PERIODS.MTD)
  const [familyKey, setFamilyKey] = useState(gradeFamilies[0]?.key)

  const { rows, yMax } = useMemo(
    () => computeGradeMetrics({ period, familyKey, thresholds: DEFAULT_THRESHOLDS }),
    [period, familyKey],
  )
  const rowsByName = useMemo(() => new Map(rows.map((r) => [r.name, r])), [rows])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Demand vs Sales — by Grade</h2>
          <p className="text-sm text-gray-400">Gap highlights under-served grades</p>
        </div>
        <div className="flex items-center gap-2">
          <GradeSelect options={gradeFamilies} value={familyKey} onChange={setFamilyKey} />
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-gray-400">
          No sub-grades with demand or sales in this period.
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 24, left: 20 }} barGap={2} barCategoryGap="18%">
              <CartesianGrid  stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                axisLine={{ stroke: 'var(--chart-axis-line)' }}
                tickLine={false}
                interval={0}
                height={44}
                label={{ value: 'Wallet Amount', position: 'insideBottom', offset: -13 }}
                tick={<GradeTick rowsByName={rowsByName} />}
              />
              <YAxis
                domain={[0, yMax]}
                tickLine={false}
                axisLine={false}
                width={48}
                label={{ value: 'Headcount', angle: -90, position: 'insideLeft', offset: -7 }}
                tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-cursor-fill)' }} />
              <Bar dataKey="demandMT" name="Demand (MT)" fill={DEMAND_COLOR} radius={[4, 4, 0, 0]} maxBarSize={64} />
              <Bar dataKey="salesMT" name="Sales (MT)" fill={SALES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: DEMAND_COLOR }} />
          Demand (MT)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SALES_COLOR }} />
          Sales (MT)
        </span>
      </div>
    </div>
  )
}
