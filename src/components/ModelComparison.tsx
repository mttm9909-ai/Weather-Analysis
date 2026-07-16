import { AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react'
import { formatDateTime, formatNumber, windCompass } from '../lib/weather'
import type { ModelSummary } from '../types/weather'

interface ModelComparisonProps {
  summaries: ModelSummary[]
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="sparkline-empty">—</span>
  const width = 132
  const height = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((value, index) => `${(index / (values.length - 1)) * width},${height - ((value - min) / range) * (height - 4) - 2}`).join(' ')
  return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Temperature trend"><polyline points={points} /></svg>
}

const StatusIcon = ({ status }: Pick<ModelSummary, 'status'>) => {
  if (status === 'operational') return <CheckCircle2 size={15} className="status-icon operational" />
  if (status === 'degraded') return <AlertCircle size={15} className="status-icon degraded" />
  return <MinusCircle size={15} className="status-icon unavailable" />
}

export function ModelComparison({ summaries }: ModelComparisonProps) {
  return (
    <section className="panel model-panel" id="models" aria-labelledby="models-heading">
      <div className="panel-heading-row">
        <div>
          <h2 id="models-heading">Model comparison</h2>
          <p>Next 72 hours · independent models receive one consensus vote</p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="model-table">
          <thead>
            <tr>
              <th>Model</th><th>Temperature trend</th><th>Range</th><th>Total rain</th><th>Rain peak</th><th>Peak wind</th><th>vs consensus</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((model) => (
              <tr key={model.id} className={model.status === 'unavailable' ? 'muted-row' : ''}>
                <td><span className="model-name"><StatusIcon status={model.status} />{model.name}</span><small>{model.provider}</small></td>
                <td><Sparkline values={model.trend} /></td>
                <td>{model.temperatureMin == null ? '—' : `${formatNumber(model.temperatureMin)}–${formatNumber(model.temperatureMax ?? 0)}°C`}</td>
                <td>{model.rainTotal72h == null ? '—' : `${formatNumber(model.rainTotal72h, 1)} mm`}</td>
                <td>{model.rainPeakTime ? formatDateTime(model.rainPeakTime) : 'No rain'}</td>
                <td>{model.windPeak == null ? '—' : `${formatNumber(model.windPeak)} km/h ${windCompass(model.windDirection)}`}</td>
                <td>{model.difference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
