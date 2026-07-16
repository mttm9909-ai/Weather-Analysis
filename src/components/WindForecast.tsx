import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, Compass, Gauge, Navigation, RotateCcw, SlidersHorizontal, Wind } from 'lucide-react'
import { formatDate, formatDateTime, formatHour, formatNumber, windCompass } from '../lib/weather'
import type { HourlyForecast } from '../types/weather'

interface WindForecastProps {
  hourly: HourlyForecast[]
}

const DEFAULT_THRESHOLDS = { sustained: 20, gust: 35 }

const readThresholds = () => {
  if (typeof window === 'undefined') return DEFAULT_THRESHOLDS
  try {
    const stored = JSON.parse(window.localStorage.getItem('blenheim-wind-thresholds') ?? '') as Partial<typeof DEFAULT_THRESHOLDS>
    return {
      sustained: typeof stored.sustained === 'number' ? stored.sustained : DEFAULT_THRESHOLDS.sustained,
      gust: typeof stored.gust === 'number' ? stored.gust : DEFAULT_THRESHOLDS.gust,
    }
  } catch {
    return DEFAULT_THRESHOLDS
  }
}

export function WindForecast({ hourly }: WindForecastProps) {
  const [thresholds, setThresholds] = useState(readThresholds)
  const next72 = hourly.slice(0, 72)
  const chartData = useMemo(() => hourly.slice(0, 72).map((point, index) => ({
    ...point,
    showTick: index % 6 === 0,
    gustBand: [point.spread.windGustMin, point.spread.windGustMax],
  })), [hourly])
  const peak = next72.reduce((highest, point) => point.windGust > highest.windGust ? point : highest, next72[0])
  const widestSpread = Math.max(...next72.map((point) => point.spread.windGustMax - point.spread.windGustMin))
  const widestDirectionSpread = Math.max(...next72.map((point) => point.spread.windDirectionSpread))
  const directionSamples = next72.filter((_, index) => index % 6 === 0).slice(0, 12)
  const agreement = widestSpread <= 8 && widestDirectionSpread <= 35
    ? 'High'
    : widestSpread <= 16 && widestDirectionSpread <= 70
      ? 'Moderate'
      : 'Low'
  const thresholdPoints = next72.filter((point) => point.windSpeed >= thresholds.sustained || point.windGust >= thresholds.gust)
  const firstThreshold = thresholdPoints[0]
  const sustainedHours = next72.filter((point) => point.windSpeed >= thresholds.sustained).length
  const gustHours = next72.filter((point) => point.windGust >= thresholds.gust).length

  useEffect(() => {
    window.localStorage.setItem('blenheim-wind-thresholds', JSON.stringify(thresholds))
  }, [thresholds])

  const updateSustained = (value: number) => setThresholds((current) => ({
    sustained: value,
    gust: Math.max(current.gust, value + 5),
  }))

  const updateGust = (value: number) => setThresholds((current) => ({
    ...current,
    gust: Math.max(value, current.sustained + 5),
  }))

  return (
    <section className="panel wind-panel" id="wind" aria-labelledby="wind-heading">
      <div className="panel-heading-row">
        <div>
          <h2 id="wind-heading"><Wind size={20} />72-hour wind outlook</h2>
          <p>Sustained wind, gusts, direction and model spread</p>
        </div>
        <div className={`wind-confidence ${agreement.toLowerCase()}`}>
          <span>Wind confidence</span><strong>{agreement}</strong>
        </div>
      </div>
      <div className="wind-layout">
        <div>
          <div className="wind-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e4eaf1" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="time"
                  axisLine={{ stroke: '#aeb9c7' }}
                  tickLine={false}
                  tick={{ fill: '#5e6b7f', fontSize: 11 }}
                  tickFormatter={(time, index) => chartData[index]?.showTick ? formatHour(String(time)) : ''}
                  interval={0}
                />
                <YAxis domain={[0, 'dataMax + 5']} tickLine={false} axisLine={false} tick={{ fill: '#5e6b7f', fontSize: 11 }} unit=" km/h" width={64} />
                <Tooltip
                  contentStyle={{ border: '1px solid #dbe3ed', borderRadius: 8, boxShadow: '0 8px 24px rgba(17, 40, 75, .1)' }}
                  labelFormatter={(time) => `${formatDate(String(time))}, ${formatHour(String(time))}`}
                  formatter={(value, name) => Array.isArray(value)
                    ? [`${formatNumber(Number(value[0]), 1)}–${formatNumber(Number(value[1]), 1)} km/h`, name]
                    : [`${formatNumber(Number(value), 1)} km/h`, name]}
                />
                <Area type="monotone" dataKey="gustBand" name="Model gust range" fill="#e6f0f8" stroke="#a5bdd3" strokeWidth={1} />
                <Line type="monotone" dataKey="windGust" name="Consensus gusts" stroke="#6e90b1" strokeWidth={1.8} strokeDasharray="5 3" dot={false} />
                <Line type="monotone" dataKey="windSpeed" name="Sustained wind" stroke="#0c6e89" strokeWidth={2.6} dot={false} activeDot={{ r: 4 }} />
                <ReferenceLine y={thresholds.sustained} stroke="#157e75" strokeDasharray="3 4" />
                <ReferenceLine y={thresholds.gust} stroke="#de8b13" strokeDasharray="3 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="wind-direction-rail" aria-label="Wind direction through the next 72 hours">
            {directionSamples.map((point) => (
              <div key={point.time}>
                <Navigation size={17} style={{ transform: `rotate(${point.windDirection - 45}deg)` }} />
                <strong>{windCompass(point.windDirection)}</strong>
                <span>{formatHour(point.time)}</span>
              </div>
            ))}
          </div>
        </div>
        <aside className="wind-sidebar">
          <dl className="wind-highlights">
            <div><dt><Gauge size={17} />Peak gust</dt><dd>{formatNumber(peak.windGust)} km/h</dd></div>
            <div><dt><Compass size={17} />Peak direction</dt><dd>{windCompass(peak.windDirection)}</dd></div>
            <div><dt>Peak timing</dt><dd>{formatDateTime(peak.time)}</dd></div>
            <div><dt>Largest model spread</dt><dd>{formatNumber(widestSpread)} km/h</dd></div>
            <div><dt>Largest direction split</dt><dd>±{formatNumber(widestDirectionSpread)}°</dd></div>
          </dl>
          <div className={`wind-watch ${firstThreshold ? 'active' : 'clear'}`}>
            <div className="wind-watch-heading">
              <span><SlidersHorizontal size={15} />My wind watch</span>
              <button type="button" onClick={() => setThresholds(DEFAULT_THRESHOLDS)} aria-label="Reset wind thresholds"><RotateCcw size={13} /></button>
            </div>
            <label>
              <span>Sustained <strong>{thresholds.sustained} km/h</strong></span>
              <input type="range" min="10" max="60" step="5" value={thresholds.sustained} onChange={(event) => updateSustained(Number(event.target.value))} />
            </label>
            <label>
              <span>Gusts <strong>{thresholds.gust} km/h</strong></span>
              <input type="range" min="15" max="90" step="5" value={thresholds.gust} onChange={(event) => updateGust(Number(event.target.value))} />
            </label>
            <div className="wind-watch-result">
              {firstThreshold ? <AlertTriangle size={15} /> : <Wind size={15} />}
              <div>
                <strong>{firstThreshold ? `Next crossing ${formatDateTime(firstThreshold.time)}` : 'No threshold crossings'}</strong>
                <span>{sustainedHours} sustained-wind hours · {gustHours} gust hours</span>
              </div>
            </div>
          </div>
          <p className="wind-method-note">Direction is combined as east–west and north–south vectors before being converted back to a compass bearing.</p>
        </aside>
      </div>
    </section>
  )
}
