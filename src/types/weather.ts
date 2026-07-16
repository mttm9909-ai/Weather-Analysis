export type SourceStatus = 'operational' | 'degraded' | 'unavailable'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface LocationInfo {
  name: string
  region: string
  latitude: number
  longitude: number
  timezone: string
}

export interface SpreadRange {
  temperatureMin: number
  temperatureMax: number
  rainMin: number
  rainMax: number
  windSpeedMin: number
  windSpeedMax: number
  windGustMin: number
  windGustMax: number
  windDirectionSpread: number
}

export interface HourlyForecast {
  time: string
  temperature: number
  rain: number
  humidity: number
  windSpeed: number
  windDirection: number
  windGust: number
  cloudCover: number
  pressure: number
  weatherCode: number
  rainAgreement: number
  sourceCount: number
  spread: SpreadRange
}

export interface DailyForecast {
  date: string
  weatherCode: number
  temperatureMax: number
  temperatureMin: number
  rainTotal: number
  rainAgreement: number
  windPeak: number
  sourceCount: number
}

export interface ModelHourlyForecast {
  time: string
  temperature: number | null
  rain: number | null
  humidity: number | null
  windSpeed: number | null
  windDirection: number | null
  windGust: number | null
  cloudCover: number | null
  pressure: number | null
  weatherCode: number | null
}

export interface ModelForecast {
  id: string
  name: string
  provider: string
  resolution: string
  independentVote: boolean
  status: SourceStatus
  updatedAt: string
  error?: string
  hourly: ModelHourlyForecast[]
}

export interface ModelSummary {
  id: string
  name: string
  provider: string
  status: SourceStatus
  independentVote: boolean
  temperatureMin: number | null
  temperatureMax: number | null
  rainTotal72h: number | null
  rainPeakTime: string | null
  windPeak: number | null
  windDirection: number | null
  difference: string
  trend: number[]
}

export interface ConfidenceSummary {
  level: ConfidenceLevel
  title: string
  reason: string
  temperatureSpread: number
  activeSources: number
  expectedSources: number
}

export interface RainAnalysis {
  nextRainTime: string | null
  heaviestStart: string | null
  heaviestEnd: string | null
  total72h: number
  dryWindowStart: string | null
  dryWindowEnd: string | null
  peakAgreement: number
}

export interface VineyardCondition {
  id: string
  label: string
  value: string
  level: 'good' | 'moderate' | 'poor' | 'neutral'
  detail: string
}

export interface AccuracyMetric {
  modelId: string
  modelName: string
  verifiedDays: number
  temperatureMae: number | null
  rainMae: number | null
  windMae: number | null
}

export interface SourceLink {
  name: string
  url: string
}

export interface ForecastBundle {
  schemaVersion: number
  generatedAt: string
  isDemo: boolean
  location: LocationInfo
  attribution: string[]
  current: HourlyForecast
  hourly: HourlyForecast[]
  daily: DailyForecast[]
  models: ModelForecast[]
  modelSummaries: ModelSummary[]
  confidence: ConfidenceSummary
  rainAnalysis: RainAnalysis
  vineyardConditions: VineyardCondition[]
  accuracy: AccuracyMetric[]
  links: SourceLink[]
}
