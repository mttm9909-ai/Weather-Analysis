import { CheckCircle2, Gauge, Navigation, Waves, Wind } from 'lucide-react'
import { confidenceLabel, formatDateTime, formatNumber, weatherDescription, windCompass } from '../lib/weather'
import type { ConfidenceSummary, DailyForecast, HourlyForecast } from '../types/weather'
import { WeatherGlyph } from './WeatherGlyph'

interface CurrentConditionsProps {
  current: HourlyForecast
  today: DailyForecast
  confidence: ConfidenceSummary
}

export function CurrentConditions({ current, today, confidence }: CurrentConditionsProps) {
  return (
    <section className="panel current-panel" aria-labelledby="current-heading">
      <div className="section-title-line">
        <div>
          <h2 id="current-heading">Forecast for {formatDateTime(current.time)}</h2>
          <p className="current-scope-note">Nearest hourly model consensus—not a live station observation.</p>
        </div>
        <span className="source-count">{current.sourceCount} models</span>
      </div>
      <div className="current-hero">
        <WeatherGlyph code={current.weatherCode} size={62} className="current-weather-icon" />
        <div>
          <div className="current-temperature">{formatNumber(current.temperature, 1)}<span>°C</span></div>
          <div className="current-description">{weatherDescription(current.weatherCode)}</div>
        </div>
      </div>
      <dl className="condition-list">
        <div><dt><Waves size={15} />High / low</dt><dd>{formatNumber(today.temperatureMax)}° / {formatNumber(today.temperatureMin)}°</dd></div>
        <div><dt><Wind size={15} />Wind</dt><dd>{windCompass(current.windDirection)} {formatNumber(current.windSpeed)} km/h</dd></div>
        <div><dt><Navigation size={15} />Gusts</dt><dd>{formatNumber(current.windGust)} km/h</dd></div>
        <div><dt><Gauge size={15} />Pressure</dt><dd>{formatNumber(current.pressure)} hPa</dd></div>
      </dl>
      <div className={`confidence-box ${confidence.level}`}>
        <CheckCircle2 size={22} aria-hidden="true" />
        <div>
          <strong>Confidence: {confidenceLabel(confidence.level)}</strong>
          <p>{confidence.reason}</p>
        </div>
      </div>
    </section>
  )
}
