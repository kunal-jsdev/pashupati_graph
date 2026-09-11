import { useMemo, useRef, useState, useEffect } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  computePartyRateMetrics,
  fetchPartyRateData,
  getActiveGrades,
  getParties,
} from '../lib/metrics'

function GradeSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = options.find((o) => o.CODE === value)

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
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 focus:outline-none"
      >
        {current?.NAME ?? 'Select Grade'}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 max-h-60 w-44 overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {options.map((opt) => (
            <button
              key={opt.CODE}
              type="button"
              onClick={() => {
                onChange(opt.CODE)
                setOpen(false)
              }}
              className={
                'block w-full rounded-lg px-3 py-1.5 text-left text-sm ' +
                (opt.CODE === value
                  ? 'bg-emerald-50 font-medium text-emerald-800'
                  : 'text-gray-700 hover:bg-gray-50')
              }
            >
              {opt.NAME}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchablePartySelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const current = options.find((o) => o.CODE === value)

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.NAME.toLowerCase().includes(q))
  }, [options, search])

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 focus:outline-none"
      >
        {current?.NAME ?? 'Select Party'}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <input
            type="text"
            placeholder="Search party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 w-full rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-800 focus:border-emerald-500 focus:outline-none"
            autoFocus
          />
          <div className="max-h-48 overflow-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-gray-400">No parties found</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.CODE}
                  type="button"
                  onClick={() => {
                    onChange(opt.CODE)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={
                    'block w-full rounded-lg px-2.5 py-1.5 text-left text-xs ' +
                    (opt.CODE === value
                      ? 'bg-emerald-50 font-semibold text-emerald-800'
                      : 'text-gray-700 hover:bg-gray-50')
                  }
                >
                  {opt.NAME}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HollowCircleDot(props) {
  const { cx, cy, payload } = props
  if (payload?.rate === null || cx === undefined || cy === undefined) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      stroke="var(--rate-line-color)"
      strokeWidth={2}
      fill="var(--chart-marker-surface)"
    />
  )
}

function MeanInlineLabel({ viewBox, mean }) {
  if (!viewBox || mean === null) return null
  const { x, y, width } = viewBox
  return (
    <text
      x={x + width - 4}
      y={y - 8}
      fill="var(--rate-mean-label)"
      fontSize={12}
      fontWeight={600}
      textAnchor="end"
    >
      Mean ₹{mean.toFixed(1)}
    </text>
  )
}

function ChartTooltip({ active, payload, mean }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  if (row.rate === null) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-500 shadow-md">
        <div className="font-semibold text-gray-800">{row.monthLabel}</div>
        <div>No transactions</div>
      </div>
    )
  }

  const diffFromMean = mean !== null ? row.rate - mean : null
  const diffStr =
    diffFromMean !== null
      ? diffFromMean >= 0
        ? `+${diffFromMean.toFixed(1)}`
        : `${diffFromMean.toFixed(1)}`
      : ''

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5 text-xs shadow-lg">
      <div className="mb-1 font-bold text-gray-900">{row.monthLabel}</div>
      <div className="font-semibold text-blue-600">Rate: ₹{row.rate.toFixed(1)} / KG</div>
      {mean !== null && <div className="text-amber-700">Deviation vs Mean: {diffStr} ₹/KG</div>}
    </div>
  )
}

export default function PartyRateChart() {
  const grades = useMemo(() => getActiveGrades(), [])
  const parties = useMemo(() => getParties(), [])

  const [selectedGrade, setSelectedGrade] = useState(grades[0]?.CODE || 'HDPEAP')
  const [selectedParty, setSelectedParty] = useState(parties[0]?.CODE || 'P001')

  const metrics = useMemo(() => {
    const data = fetchPartyRateData(selectedParty, selectedGrade)
    return computePartyRateMetrics(data)
  }, [selectedParty, selectedGrade])

  const {
    insufficientHistory,
    monthlyPoints,
    mean,
    latestVsMean,
    momShift,
    prevMonthContext,
    yMin,
    yMax,
  } = metrics

  const formattedLatestVsMean = useMemo(() => {
    if (latestVsMean === null) return ''
    return latestVsMean >= 0 ? `+${latestVsMean.toFixed(1)}` : `${latestVsMean.toFixed(1)}`
  }, [latestVsMean])

  const formattedMomShift = useMemo(() => {
    if (momShift === null) return ''
    return momShift >= 0 ? `+${momShift.toFixed(1)} ₹/KG` : `${momShift.toFixed(1)} ₹/KG`
  }, [momShift])

  const momBadgeStyle = useMemo(() => {
    if (momShift === null) return ''
    if (momShift > 0) return 'bg-[var(--rate-up-bg)] text-[var(--rate-up-text)] border border-[var(--rate-up-border)]'
    if (momShift < 0) return 'bg-[var(--rate-down-bg)] text-[var(--rate-down-text)] border border-[var(--rate-down-border)]'
    return 'bg-gray-100 text-gray-700 border border-gray-200'
  }, [momShift])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Historical Demand Trend — by Party (Financial Year Wise)
          </h2>
          <p className="text-xs text-gray-500">Client-wise monthly demand, FY 2025-26</p>
        </div>
        <div className="flex items-center gap-2">
          <GradeSelect options={grades} value={selectedGrade} onChange={setSelectedGrade} />
          <SearchablePartySelect
            options={parties}
            value={selectedParty}
            onChange={setSelectedParty}
          />
        </div>
      </div>

      {insufficientHistory ? (
        <div className="mb-6 flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50/60 p-6 text-center text-sm font-medium text-amber-800">
          Insufficient history — fewer than 2 months of transactions exist for this party and grade.
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div className="flex items-baseline gap-2 text-sm font-medium text-gray-700">
              <span>Latest vs mean</span>
              <span className="text-xl font-bold text-gray-900">{formattedLatestVsMean}</span>
              <span className="text-xs font-normal text-gray-500">
                ( ₹/kg deviation from 6-month mean )
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              Month-over-month mean shift ( Visible to the whole sales team — flags favoritism or market deviation )
            </p>
          </div>

          {momShift !== null && (
            <div
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs ${momBadgeStyle}`}
              title={prevMonthContext}
            >
              {formattedMomShift}
            </div>
          )}
        </div>
      )}

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyPoints} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
            <XAxis
              dataKey="monthLabel"
              axisLine={{ stroke: 'var(--chart-axis-line)' }}
              tickLine={false}
              label={{
                value: 'Month',
                position: 'insideBottom',



              }}
              tick={{ fontSize: 12, fill: 'var(--ink-secondary)' }}
            />
            <YAxis
              domain={[yMin, yMax]}
              label={{
                value: 'MT',
                angle: -90,
                position: 'insideLeft',
                offset: 0,


              }}
              tickLine={false}
              width={40}
              tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
              tickFormatter={(v) => Math.round(v)}
            />
            <Tooltip content={<ChartTooltip mean={mean} />} />

            {!insufficientHistory && mean !== null && (
              <ReferenceLine
                y={mean}
                stroke="var(--rate-mean-line)"
                strokeDasharray="4 4"
                label={<MeanInlineLabel mean={mean} />}
              />
            )}

            <Line
              type="monotone"
              dataKey="rate"
              stroke="var(--rate-line-color)"
              strokeWidth={2.5}
              connectNulls={false}
              dot={<HollowCircleDot />}
              activeDot={{ r: 6, fill: 'var(--rate-line-color)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
