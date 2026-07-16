import { AlertTriangle, CloudOff } from 'lucide-react'
import { AppHeader } from './components/AppHeader'
import { CurrentConditions } from './components/CurrentConditions'
import { DailyForecastStrip } from './components/DailyForecastStrip'
import { AccuracyPanel, RainPanel, SourceFooter, VineyardPanel } from './components/InsightPanels'
import { ModelComparison } from './components/ModelComparison'
import { OverviewChart } from './components/OverviewChart'
import { WindForecast } from './components/WindForecast'
import { useForecast } from './hooks/useForecast'
import { ageInHours } from './lib/weather'

export default function App() {
  const { data, loading, error, refresh } = useForecast()
  const stale = !data.isDemo && ageInHours(data.generatedAt) > 6

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
        <div className="primary-grid">
          <OverviewChart hourly={data.hourly} />
          <CurrentConditions current={data.current} today={data.daily[0]} confidence={data.confidence} />
        </div>
        <DailyForecastStrip daily={data.daily} />
        <WindForecast hourly={data.hourly} />
        <div className="analysis-grid">
          <ModelComparison summaries={data.modelSummaries} />
          <aside className="insight-stack">
            <RainPanel rain={data.rainAnalysis} />
            <VineyardPanel conditions={data.vineyardConditions} />
            <AccuracyPanel accuracy={data.accuracy} />
          </aside>
        </div>
      </main>
      <SourceFooter models={data.models} links={data.links} attribution={data.attribution} />
    </div>
  )
}
