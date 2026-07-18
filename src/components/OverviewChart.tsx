import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDate, formatHour, formatNumber } from '../lib/weather'
import type { HourlyForecast } from '../types/weather'

interface OverviewChartProps {
  hourly: HourlyForecast[]
}

export function OverviewChart({ hourly }: OverviewChartProps) {
  const chartData = useMemo(() => hourly.slice(0, 48).map((point, index) => ({
    ...point,
    showTick: index % 6 === 0,
  })), [hourly])

  const dayBoundaries = chartData.filter((point) => point.time.endsWith('T00:00'))

  return (
    <section className="panel overview-panel" aria-labelledby="overview-heading">
      <div className="panel-heading-row">
        <div>
          <h2 id="overview-heading">48-hour weather overview</h2>
          <p>Most-likely forecast from independent global models</p>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="legend-line" />Temperature</span>
          <span><i className="legend-bar" />Rain</span>
        </div>
      </div>
      <div className="chart-day-labels" aria-hidden="true">
        {Array.from(new Set(chartData.map((point) => point.time.slice(0, 10)))).slice(0, 3).map((date) => (
          <span key={date}>{formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        ))}
      </div>
      <div className="overview-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#e4eaf1" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="time"
              axisLine={{ stroke: '#aeb9c7' }}
              tickLine={false}
              tick={{ fill: '#5e6b7f', fontSize: 11 }}
              tickFormatter={(time, index) => chartData[index]?.showTick ? formatHour(String(time)) : ''}
              interval={0}
            />
            <YAxis yAxisId="temp" domain={['dataMin - 2', 'dataMax + 2']} tickLine={false} axisLine={false} tick={{ fill: '#5e6b7f', fontSize: 11 }} unit="°" />
            <YAxis yAxisId="rain" orientation="right" domain={[0, 'auto']} tickLine={false} axisLine={false} tick={{ fill: '#5e6b7f', fontSize: 11 }} unit=" mm" width={45} />
            <Tooltip
              contentStyle={{ border: '1px solid #dbe3ed', borderRadius: 8, boxShadow: '0 8px 24px rgba(17, 40, 75, .1)' }}
              labelFormatter={(time) => `${formatDate(String(time))}, ${formatHour(String(time))}`}
              formatter={(value, name) => name === 'Temperature' ? [`${formatNumber(Number(value), 1)}°C`, name] : [`${formatNumber(Number(value), 1)} mm`, name]}
            />
            {dayBoundaries.map((point) => <ReferenceLine key={point.time} x={point.time} stroke="#c8d1dc" strokeDasharray="6 5" />)}
            <Bar yAxisId="rain" dataKey="rain" name="Rain" fill="#a8d1f4" stroke="#5da5e6" barSize={7} radius={[2, 2, 0, 0]} />
            <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temperature" stroke="#2165d6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#2165d6' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
