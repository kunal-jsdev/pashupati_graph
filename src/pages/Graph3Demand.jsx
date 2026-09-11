import DemandVsSalesChart from '../components/DemandVsSalesChart'

export default function Graph3Demand() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <a href="#/" className="text-sm font-medium text-emerald-800 hover:underline">
        ← Back
      </a>

      <div className="mt-4">
        <h1 className="text-xl font-semibold text-gray-900">Demand & Gap</h1>
        <p className="mt-0.5 text-sm text-gray-500">Demand vs sales, party trends, punch demand</p>
      </div>

      <div className="mt-4">
        <DemandVsSalesChart />
      </div>
    </div>
  )
}
