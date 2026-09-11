import { useMemo, useRef, useState, useEffect } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeSalesProductionTarget, getPriceGrades, PRICE_PERIODS } from '../lib/priceMetrics'

const SALES_COLOR = 'var(--sales-color)'
const PRODUCTION_COLOR = 'var(--production-cost-color)'
const TARGET_COLOR = 'var(--target-price-color)'
const WATCH_AMBER = 'var(--watch-amber)'
const UNDER_SERVED_RED = 'var(--under-served-red)'

function GradeSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = options.find((o) => o.code === value)

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
        {current?.name ?? 'Select grade'}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 max-h-60 w-40 overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {options.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => {
                onChange(opt.code)
                setOpen(false)
              }}
              className={
                'block w-full rounded-lg px-3 py-1.5 text-left text-sm ' +
                (opt.code === value ? 'bg-emerald-50 font-medium text-emerald-800' : 'text-gray-700 hover:bg-gray-50')
              }
            >
              {opt.name}
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
        { key: PRICE_PERIODS.MTD, label: 'MTD' },
        { key: PRICE_PERIODS.L12M, label: 'Last 12 Month' },
      ].map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={
            'rounded-full px-3 py-1.5 font-medium transition-colors ' +
            (period === opt.key ? 'bg-emerald-800 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900')
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SalesDot(props) {
  const { cx, cy, payload } = props
  if (payload.salesPrice === null || cx == null || cy == null) return null
  // Every point is the same hollow marker - critical/warning are only
  // called out in the tooltip (red "Selling below cost" / amber Target Gap).
  return <circle cx={cx} cy={cy} r={4.5} fill="var(--chart-marker-surface)" stroke={SALES_COLOR} strokeWidth={2} />
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5 text-xs shadow-lg">
      <div className="mb-1 font-bold text-gray-900">{label}</div>

      {row.flag === 'critical' && (
        <div className="mb-1 font-semibold" style={{ color: UNDER_SERVED_RED }}>
          Selling below cost
        </div>
      )}
      {row.flag === 'warning' && row.targetGap !== null && (
        <div className="mb-1 font-semibold" style={{ color: WATCH_AMBER }}>
          Target Gap: {row.targetGap.toFixed(1)} ₹/KG
        </div>
      )}

      <div style={{ color: SALES_COLOR }}>
        Sales Price: {row.salesPrice !== null ? `₹${row.salesPrice.toFixed(1)}` : '—'}
      </div>
      <div style={{ color: PRODUCTION_COLOR }}>
        Production Cost: {row.productionCost !== null ? `₹${row.productionCost.toFixed(1)}` : '—'}
        {row.carriedForward && (
          <span className="ml-1 text-gray-400">(carried forward from {row.carriedFromLabel})</span>
        )}
      </div>
      <div className="text-gray-500">
        Expected Target Price: {row.targetPrice !== null ? `₹${row.targetPrice.toFixed(1)}` : '—'}
      </div>

      {row.marginRs !== null && (
        <div className="mt-1 text-gray-400">
          Margin: ₹{row.marginRs.toFixed(1)} / KG ({row.marginPct.toFixed(1)}%)
        </div>
      )}
    </div>
  )
}

export default function SalesProductionTargetChart() {
  const grades = useMemo(() => getPriceGrades(), [])
  const [period, setPeriod] = useState(PRICE_PERIODS.MTD)
  const [gradeCode, setGradeCode] = useState(grades[0]?.code)

  const { points, yMax } = useMemo(
    () => computeSalesProductionTarget({ period, gradeCode }),
    [period, gradeCode],
  )

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Sales – Production Target-Price Line</h2>
          <p className="text-sm text-gray-400 max-w-140">
            Shared with Production dashboard · flags when sales price drops while production cost holds steady
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GradeSelect options={grades} value={gradeCode} onChange={setGradeCode} />
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 20 }}>
            <CartesianGrid  stroke="var(--chart-grid)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: 'var(--chart-axis-line)' }}
              tickLine={false}
              interval="preserveStartEnd"
              height={40}
              label={{ value: 'Date', position: 'insideBottom', offset: -6 }}
              tick={{ fontSize: 12, fill: 'var(--ink-secondary)' }}
            />
            <YAxis
              domain={[0, yMax]}
              tickCount={5}
              tickLine={false}
              axisLine={false}
              width={52}
              label={{ value: 'Price', angle: -90, position: 'insideLeft', offset: -10 }}
              tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip content={<ChartTooltip />} />

            <Line
              dataKey="productionCost"
              name="Production Cost"
              stroke={PRODUCTION_COLOR}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              dataKey="targetPrice"
              name="Expected Target Price"
              stroke={TARGET_COLOR}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
            />
            <Line
              dataKey="salesPrice"
              name="Sales Price"
              stroke={SALES_COLOR}
              strokeWidth={2.5}
              dot={<SalesDot />}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: PRODUCTION_COLOR }} />
          Production Cost
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TARGET_COLOR }} />
          Expected Target Price
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SALES_COLOR }} />
          Sales Price
        </span>
      </div>
    </div>
  )
}
