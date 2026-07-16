import type { ConfidenceLevel, SourceStatus } from '../types/weather'

export const formatNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-NZ', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)

export const localDate = (isoTime: string) => isoTime.slice(0, 10)

export const formatHour = (isoTime: string) => {
  const hour = Number(isoTime.slice(11, 13))
  if (hour === 0) return '12 am'
  if (hour === 12) return '12 pm'
  return `${hour % 12} ${hour < 12 ? 'am' : 'pm'}`
}

export const formatDate = (isoDate: string, options?: Intl.DateTimeFormatOptions) => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('en-NZ', options ?? { weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, day),
  )
}

export const formatDateTime = (isoTime: string | null) => {
  if (!isoTime) return 'No rain identified'
  return `${formatDate(isoTime)}, ${formatHour(isoTime)}`
}

export const formatUpdatedTime = (isoTime: string) => {
  const value = new Date(isoTime)
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(value)
}

export const ageInHours = (isoTime: string) => Math.max(0, (Date.now() - new Date(isoTime).getTime()) / 3_600_000)

export const statusLabel = (status: SourceStatus) => {
  if (status === 'operational') return 'Operational'
  if (status === 'degraded') return 'Partial data'
  return 'Unavailable'
}

export const confidenceLabel = (level: ConfidenceLevel) =>
  level.charAt(0).toUpperCase() + level.slice(1)

export const windCompass = (degrees: number | null | undefined) => {
  if (degrees == null || Number.isNaN(degrees)) return '—'
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return points[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]
}

export const weatherDescription = (code: number) => {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Mostly clear'
  if (code === 3) return 'Overcast'
  if ([45, 48].includes(code)) return 'Foggy'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code >= 95) return 'Thunderstorms'
  return 'Mixed conditions'
}

export const weatherIconKind = (code: number) => {
  if (code === 0) return 'sun'
  if (code <= 2) return 'partly-cloudy'
  if (code === 3) return 'cloud'
  if ([45, 48].includes(code)) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloud'
}
