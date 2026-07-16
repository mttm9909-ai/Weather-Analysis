import { Droplets } from 'lucide-react'
import { formatDate, formatNumber } from '../lib/weather'
import type { DailyForecast } from '../types/weather'
import { WeatherGlyph } from './WeatherGlyph'

interface DailyForecastStripProps {
  daily: DailyForecast[]
}

export function DailyForecastStrip({ daily }: DailyForecastStripProps) {
  return (
    <section className="panel daily-panel" aria-labelledby="daily-heading">
      <div className="panel-heading-row compact">
        <div>
          <h2 id="daily-heading">10-day forecast</h2>
          <p>Daily values derived from the hourly consensus</p>
        </div>
      </div>
      <div className="daily-strip">
        {daily.slice(0, 10).map((day) => (
          <article className="daily-day" key={day.date}>
            <strong>{formatDate(day.date, { weekday: 'short' })}</strong>
            <span>{formatDate(day.date, { day: 'numeric', month: 'short' })}</span>
            <WeatherGlyph code={day.weatherCode} size={30} />
            <b>{formatNumber(day.temperatureMax)}° <i>/ {formatNumber(day.temperatureMin)}°</i></b>
            <small><Droplets size={13} />{day.rainAgreement}% · {formatNumber(day.rainTotal, 1)} mm</small>
          </article>
        ))}
      </div>
    </section>
  )
}
