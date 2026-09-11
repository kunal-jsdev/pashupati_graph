import PartyRateChart from '../components/PartyRateChart'
import DemandVsSalesChart from '../components/DemandVsSalesChart'
import SalesProductionTargetChart from '../components/SalesProductionTargetChart'

export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sales Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Executive sales metrics, pricing fluctuation, and demand fulfilment trends.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Graph 1 — Sales vs Production vs Target Price</h2>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
              Margin Compression
            </span>
          </div>
          <SalesProductionTargetChart />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Graph 2 — Party-wise Rate Fluctuation</h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Pricing Fluctuation
            </span>
          </div>
          <PartyRateChart />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Graph 3 — Demand & Gap</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Demand & Fulfilment
            </span>
          </div>
          <DemandVsSalesChart />
        </section>
      </div>
    </div>
  )
}
