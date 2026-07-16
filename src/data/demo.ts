import type { ForecastBundle, ModelForecast, ModelSummary } from '../types/weather'

const pad = (value: number) => String(value).padStart(2, '0')

const localIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`

const dateIso = (date: Date) => localIso(date).slice(0, 10)

const modelDefinitions = [
  ['ecmwf', 'ECMWF', 'ECMWF', '9–25 km'],
  ['gfs', 'GFS', 'NOAA', '13 km'],
  ['icon', 'ICON', 'DWD', '11 km'],
  ['ukmo', 'UKMO', 'UK Met Office', '10 km'],
  ['access', 'ACCESS-G', 'Australian BOM', '15 km'],
  ['gem', 'GEM', 'Environment Canada', '15 km'],
] as const

export const createDemoForecast = (): ForecastBundle => {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const generatedAt = now.toISOString()

  const modelForecasts: ModelForecast[] = modelDefinitions.map(([id, name, provider, resolution], modelIndex) => ({
    id,
    name,
    provider,
    resolution,
    independentVote: true,
    status: id === 'access' ? 'degraded' : 'operational',
    updatedAt: generatedAt,
    error: id === 'access' ? 'Previewing partial availability handling.' : undefined,
    hourly: Array.from({ length: 120 }, (_, index) => {
      const time = new Date(now.getTime() + index * 3_600_000)
      const phase = ((time.getHours() - 5) / 24) * Math.PI * 2
      const rainPulse = index >= 23 && index <= 34 ? Math.max(0, 1.1 - Math.abs(index - 29) * 0.16) : 0
      const temperature = 12.5 + 5.2 * Math.sin(phase) + (modelIndex - 2.5) * 0.22
      return {
        time: localIso(time),
        temperature: Number(temperature.toFixed(1)),
        rain: Number(Math.max(0, rainPulse + (modelIndex - 2.5) * 0.035).toFixed(2)),
        humidity: Math.round(68 - 15 * Math.sin(phase) + modelIndex),
        windSpeed: Number((10 + 6 * Math.max(0, Math.sin(phase + 0.8)) + modelIndex * 0.7).toFixed(1)),
        windDirection: 220 + modelIndex * 5,
        windGust: Number((18 + 8 * Math.max(0, Math.sin(phase + 0.8)) + modelIndex).toFixed(1)),
        cloudCover: Math.round(Math.min(100, 28 + rainPulse * 58 + modelIndex * 2)),
        pressure: Number((1017 - rainPulse * 4 + modelIndex * 0.3).toFixed(1)),
        weatherCode: rainPulse > 0.35 ? 61 : index % 24 < 7 ? 2 : 1,
      }
    }),
  }))

  const hourly = Array.from({ length: 120 }, (_, index) => {
    const values = modelForecasts.map((model) => model.hourly[index])
    const temperatures = values.map((value) => value.temperature ?? 0)
    const rains = values.map((value) => value.rain ?? 0)
    const temperature = temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length
    const rain = rains.reduce((sum, value) => sum + value, 0) / rains.length
    const rainyModels = rains.filter((value) => value >= 0.2).length
    return {
      time: values[0].time,
      temperature: Number(temperature.toFixed(1)),
      rain: Number(rain.toFixed(2)),
      humidity: Math.round(values.reduce((sum, value) => sum + (value.humidity ?? 0), 0) / values.length),
      windSpeed: Number((values.reduce((sum, value) => sum + (value.windSpeed ?? 0), 0) / values.length).toFixed(1)),
      windDirection: 232,
      windGust: Number((values.reduce((sum, value) => sum + (value.windGust ?? 0), 0) / values.length).toFixed(1)),
      cloudCover: Math.round(values.reduce((sum, value) => sum + (value.cloudCover ?? 0), 0) / values.length),
      pressure: Number((values.reduce((sum, value) => sum + (value.pressure ?? 0), 0) / values.length).toFixed(1)),
      weatherCode: rain > 0.3 ? 61 : values[0].weatherCode ?? 1,
      rainAgreement: Math.round((rainyModels / values.length) * 100),
      sourceCount: values.length,
      spread: {
        temperatureMin: Math.min(...temperatures),
        temperatureMax: Math.max(...temperatures),
        rainMin: Math.min(...rains),
        rainMax: Math.max(...rains),
        windSpeedMin: Math.min(...values.map((value) => value.windSpeed ?? 0)),
        windSpeedMax: Math.max(...values.map((value) => value.windSpeed ?? 0)),
        windGustMin: Math.min(...values.map((value) => value.windGust ?? 0)),
        windGustMax: Math.max(...values.map((value) => value.windGust ?? 0)),
        windDirectionSpread: 15,
      },
    }
  })

  const days = Array.from(new Set(hourly.map((point) => point.time.slice(0, 10)))).slice(0, 10)
  const daily = days.map((date) => {
    const points = hourly.filter((point) => point.time.startsWith(date))
    return {
      date,
      weatherCode: points.some((point) => point.rain >= 0.25) ? 61 : points[12]?.weatherCode ?? 1,
      temperatureMax: Math.max(...points.map((point) => point.temperature)),
      temperatureMin: Math.min(...points.map((point) => point.temperature)),
      rainTotal: Number(points.reduce((sum, point) => sum + point.rain, 0).toFixed(1)),
      rainAgreement: Math.max(...points.map((point) => point.rainAgreement)),
      windPeak: Math.max(...points.map((point) => point.windGust)),
      sourceCount: 6,
    }
  })

  const summaryFromModel = (model: ModelForecast): ModelSummary => {
    const next72 = model.hourly.slice(0, 72)
    const rainPeak = next72.reduce((best, value) => (value.rain ?? 0) > (best.rain ?? 0) ? value : best, next72[0])
    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      status: model.status,
      independentVote: model.independentVote,
      temperatureMin: Math.min(...next72.map((value) => value.temperature ?? Infinity)),
      temperatureMax: Math.max(...next72.map((value) => value.temperature ?? -Infinity)),
      rainTotal72h: Number(next72.reduce((sum, value) => sum + (value.rain ?? 0), 0).toFixed(1)),
      rainPeakTime: rainPeak.time,
      windPeak: Math.max(...next72.map((value) => value.windGust ?? 0)),
      windDirection: rainPeak.windDirection,
      difference: model.id === 'ecmwf' ? 'Near consensus' : model.id === 'gem' ? 'Wetter, windier' : 'Similar pattern',
      trend: next72.filter((_, index) => index % 6 === 0).map((value) => value.temperature ?? 0),
    }
  }

  const modelSummaries = modelForecasts.map(summaryFromModel)
  const rainPoints = hourly.slice(0, 72).filter((point) => point.rain >= 0.2)
  const firstDryAfterRain = hourly.slice(0, 96).findIndex((point, index, values) =>
    index > 30 && values.slice(index, index + 12).every((candidate) => candidate.rain < 0.1),
  )

  return {
    schemaVersion: 1,
    generatedAt,
    isDemo: true,
    location: {
      name: 'Blenheim',
      region: 'Marlborough, New Zealand',
      latitude: -41.5134,
      longitude: 173.9612,
      timezone: 'Pacific/Auckland',
    },
    attribution: ['Weather data: Open-Meteo', 'Yr data: MET Norway'],
    current: hourly[0],
    hourly,
    daily,
    models: modelForecasts,
    modelSummaries,
    confidence: {
      level: 'high',
      title: 'High model agreement',
      reason: 'The independent models agree closely on temperature. Rain timing is less certain later in the period.',
      temperatureSpread: Number((hourly[0].spread.temperatureMax - hourly[0].spread.temperatureMin).toFixed(1)),
      activeSources: 5,
      expectedSources: 6,
    },
    rainAnalysis: {
      nextRainTime: rainPoints[0]?.time ?? null,
      heaviestStart: rainPoints[4]?.time ?? rainPoints[0]?.time ?? null,
      heaviestEnd: rainPoints.at(-1)?.time ?? null,
      total72h: Number(hourly.slice(0, 72).reduce((sum, point) => sum + point.rain, 0).toFixed(1)),
      dryWindowStart: firstDryAfterRain >= 0 ? hourly[firstDryAfterRain].time : null,
      dryWindowEnd: firstDryAfterRain >= 0 ? hourly[firstDryAfterRain + 12]?.time ?? null : null,
      peakAgreement: Math.max(...hourly.slice(0, 72).map((point) => point.rainAgreement)),
    },
    vineyardConditions: [
      { id: 'frost', label: 'Frost risk tonight', value: 'Low', level: 'good', detail: 'Consensus minimum stays above 3°C.' },
      { id: 'spray', label: 'Next spray window', value: 'Good early tomorrow', level: 'good', detail: 'Low rain risk and manageable wind before midday.' },
      { id: 'wind', label: 'Wind / gusts', value: 'Moderate', level: 'moderate', detail: 'Gusts may briefly exceed 25 km/h this afternoon.' },
      { id: 'humidity', label: 'Humidity', value: 'Favourable', level: 'good', detail: 'Humidity falls through the middle of the day.' },
    ],
    accuracy: modelDefinitions.map(([id, name]) => ({
      modelId: id,
      modelName: name,
      verifiedDays: 0,
      temperatureMae: null,
      rainMae: null,
      windMae: null,
    })),
    links: [
      { name: 'Yr', url: 'https://www.yr.no/en/forecast/daily-table/2-6243926/New%20Zealand/Marlborough/Marlborough%20District/Blenheim' },
      { name: 'Ventusky', url: 'https://www.ventusky.com/air-pressure-map#p=-41.80;176.44;6' },
      { name: 'Weather Underground', url: 'https://www.wunderground.com/weather/nz/blenheim' },
      { name: 'MetService', url: 'https://www.metservice.com/towns-cities/regions/marlborough/locations/blenheim' },
      { name: 'NIWA', url: 'https://weather.niwa.co.nz/Blenheim' },
      { name: 'PredictWind', url: 'https://www.predictwind.com/weather/new-zealand/marlborough-region/blenheim' },
    ],
  }
}

export const demoForecast = createDemoForecast()
