import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CloudOff } from 'lucide-react'
import { AppHeader } from './components/AppHeader'
import { CurrentConditions } from './components/CurrentConditions'
import { DailyForecastStrip } from './components/DailyForecastStrip'
import { AccuracyPanel, RainPanel, SourceFooter } from './components/InsightPanels'
import { ModelComparison } from './components/ModelComparison'
import { OverviewChart } from './components/OverviewChart'
import { WindForecast } from './components/WindForecast'
import { useForecast } from './hooks/useForecast'
import { ageInHours } from './lib/weather'

const zonedHourIso = (timestamp: number, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp))
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour}:00`
}

export default function App() {
  const { data, loading, error, refresh } = useForecast()
  const [now, setNow] = useState(() => Date.now())
  const stale = !data.isDemo && ageInHours(data.generatedAt) > 6
  const nextHourForecast = useMemo(() => {
    const nextHour = zonedHourIso(now + 3_600_000, data.location.timezone)
    return data.hourly.find((point) => point.time >= nextHour) ?? data.current
  }, [data.current, data.hourly, data.location.timezone, now])
  const forecastDay = data.daily.find((day) => day.date === nextHourForecast.time.slice(0, 10)) ?? data.daily[0]

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="app-shell">
      <AppHeader generatedAt={data.generatedAt} loading={loading} onRefresh={() => void refresh()} />
      {(data.isDemo || error) && (
        <div className="notice demo-notice" role="status">
          <CloudOff size={17} />
          <span><strong>Preview data.</strong> GitHub Actions replaces this with live model forecasts when the site is deployed.</span>
        </div>
      )}
      {stale && (
        <div className="notice stale-notice" role="alert">
          <AlertTriangle size={17} />
          <span><strong>Forecast may be stale.</strong> The last successful model refresh was more than six hours ago.</span>
        </div>
      )}
      <main id="forecast">
        <WindForecast hourly={data.hourly} vineyardConditions={data.vineyardConditions} />
        <div className="primary-grid">
          <OverviewChart hourly={data.hourly} />
          <CurrentConditions current={nextHourForecast} today={forecastDay} confidence={data.confidence} />
        </div>
        <DailyForecastStrip daily={data.daily} />
        <div className="analysis-grid">
          <ModelComparison summaries={data.modelSummaries} />
          <aside className="insight-stack">
            <RainPanel rain={data.rainAnalysis} />
            <AccuracyPanel accuracy={data.accuracy} />
          </aside>
        </div>
      </main>
      <SourceFooter models={data.models} links={data.links} attribution={data.attribution} />
    </div>
  )
}
