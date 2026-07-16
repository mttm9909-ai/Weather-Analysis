import { Clock3, Droplets, ExternalLink, Leaf, ShieldCheck, Target, Wind } from 'lucide-react'
import { formatDateTime, formatNumber, statusLabel } from '../lib/weather'
import type { AccuracyMetric, ModelForecast, RainAnalysis, SourceLink, VineyardCondition } from '../types/weather'

export function RainPanel({ rain }: { rain: RainAnalysis }) {
  return (
    <section className="panel insight-panel" aria-labelledby="rain-heading">
      <div className="insight-heading"><Clock3 size={18} /><h2 id="rain-heading">Rain timing analysis</h2></div>
      <dl className="insight-list">
        <div><dt>Next likely rain</dt><dd>{formatDateTime(rain.nextRainTime)}</dd></div>
        <div><dt>Heaviest period</dt><dd>{rain.heaviestStart ? `${formatDateTime(rain.heaviestStart)} – ${formatDateTime(rain.heaviestEnd)}` : 'None identified'}</dd></div>
        <div><dt>Total over 72 hours</dt><dd>{formatNumber(rain.total72h, 1)} mm</dd></div>
        <div><dt>Peak model agreement</dt><dd>{rain.peakAgreement}%</dd></div>
        <div><dt>Next dry window</dt><dd>{rain.dryWindowStart ? `${formatDateTime(rain.dryWindowStart)} – ${formatDateTime(rain.dryWindowEnd)}` : 'No 12-hour window identified'}</dd></div>
      </dl>
    </section>
  )
}

const conditionIcons = { frost: ShieldCheck, spray: Target, wind: Wind, humidity: Droplets }

export function VineyardPanel({ conditions }: { conditions: VineyardCondition[] }) {
  return (
    <section className="panel insight-panel vineyard-panel" id="vineyard" aria-labelledby="vineyard-heading">
      <div className="insight-heading"><Leaf size={18} /><h2 id="vineyard-heading">Vineyard conditions</h2></div>
      <div className="vineyard-list">
        {conditions.map((condition) => {
          const Icon = conditionIcons[condition.id as keyof typeof conditionIcons] ?? Leaf
          return (
            <article key={condition.id}>
              <Icon size={17} />
              <div><span>{condition.label}</span><small>{condition.detail}</small></div>
              <strong className={condition.level}><i />{condition.value}</strong>
            </article>
          )
        })}
      </div>
      <p className="operational-note">Operational guidance only. Always follow chemical labels and local safety requirements.</p>
    </section>
  )
}

export function AccuracyPanel({ accuracy }: { accuracy: AccuracyMetric[] }) {
  const hasVerifiedData = accuracy.some((metric) => metric.verifiedDays > 0)
  return (
    <section className="panel insight-panel accuracy-panel" id="accuracy" aria-labelledby="accuracy-heading">
      <div className="insight-heading"><Target size={18} /><h2 id="accuracy-heading">Recent model accuracy</h2></div>
      {!hasVerifiedData && (
        <div className="learning-state">
          <strong>Local learning period</strong>
          <p>Accuracy weights remain equal until enough Blenheim observations have been verified.</p>
        </div>
      )}
      <div className="accuracy-table-wrap">
        <table className="accuracy-table">
          <thead><tr><th>Model</th><th>Days</th><th>Temp MAE</th><th>Rain MAE</th><th>Wind MAE</th></tr></thead>
          <tbody>{accuracy.map((metric) => (
            <tr key={metric.modelId}>
              <td>{metric.modelName}</td><td>{metric.verifiedDays || '—'}</td>
              <td>{metric.temperatureMae == null ? 'Learning' : `${formatNumber(metric.temperatureMae, 1)}°C`}</td>
              <td>{metric.rainMae == null ? 'Learning' : `${formatNumber(metric.rainMae, 1)} mm`}</td>
              <td>{metric.windMae == null ? 'Learning' : `${formatNumber(metric.windMae, 1)} km/h`}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}

export function SourceFooter({ models, links, attribution }: { models: ModelForecast[]; links: SourceLink[]; attribution: string[] }) {
  return (
    <footer className="panel source-footer">
      <section aria-labelledby="health-heading">
        <h2 id="health-heading">Data source health</h2>
        <div className="source-health-grid">
          {models.map((model) => (
            <div className="source-health" key={model.id}>
              <i className={model.status} />
              <div><strong>{model.name}</strong><span>{statusLabel(model.status)}</span></div>
            </div>
          ))}
        </div>
      </section>
      <section className="source-links" aria-labelledby="links-heading">
        <h2 id="links-heading">Data and reference links</h2>
        <div>{links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.name}<ExternalLink size={13} /></a>)}</div>
        <p>{attribution.join(' · ')}</p>
      </section>
    </footer>
  )
}
