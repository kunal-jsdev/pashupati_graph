const CARDS = [
  {
    href: '#/graph-2',
    title: 'Graph 2',
    subtitle: 'Coming soon',
    description: 'This view is still being built.',
    disabled: true,
  },
  {
    href: '#/graph-3',
    title: 'Graph 3',
    subtitle: 'Demand vs Sales — by Grade',
    description: 'Compare ordered demand against invoiced sales, grade by grade.',
    disabled: false,
  },
]

export default function Landing() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-gray-900">Sales Analytics</h1>
      <p className="mt-1 text-sm text-gray-500">Pick a report to open.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{card.title}</h2>
                {card.disabled && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-emerald-800">{card.subtitle}</p>
              <p className="mt-2 text-sm text-gray-500">{card.description}</p>
            </div>
            <span className="mt-4 text-sm font-medium text-emerald-800 group-hover:underline">
              Open →
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
