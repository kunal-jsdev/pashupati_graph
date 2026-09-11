import { useEffect, useState } from 'react'
import './App.css'
import Landing from './pages/Landing'
import Graph2ComingSoon from './pages/Graph2ComingSoon'
import Graph3Demand from './pages/Graph3Demand'

const ROUTES = {
  '#/graph-2': Graph2ComingSoon,
  '#/graph-3': Graph3Demand,
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return hash
}

function App() {
  const hash = useHashRoute()
  const Page = ROUTES[hash] ?? Landing

  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      <Page />
    </div>
  )
}

export default App
