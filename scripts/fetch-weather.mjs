import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildAccuracyMetrics,
  buildConfidence,
  buildConsensus,
  buildDailyForecast,
  buildModelSummaries,
  buildRainAnalysis,
  buildVineyardConditions,
  isFiniteNumber,
} from './consensus.mjs'

const LOCATION = {
  name: 'Blenheim',
  region: 'Marlborough, New Zealand',
  latitude: -41.5134,
  longitude: 173.9612,
  timezone: 'Pacific/Auckland',
}

const MODEL_DEFINITIONS = [
  { id: 'ecmwf', name: 'ECMWF IFS', provider: 'ECMWF', resolution: '9–25 km', candidates: ['ecmwf_ifs_seamless', 'ecmwf_ifs025'] },
  { id: 'gfs', name: 'GFS', provider: 'NOAA', resolution: '13 km', candidates: ['gfs_seamless', 'gfs013'] },
  { id: 'icon', name: 'ICON', provider: 'DWD', resolution: '11 km', candidates: ['icon_seamless', 'icon_global'] },
  { id: 'ukmo', name: 'UKMO Global', provider: 'UK Met Office', resolution: '10 km', candidates: ['ukmo_global_deterministic_10km'] },
  { id: 'access', name: 'ACCESS-G', provider: 'Australian Bureau of Meteorology', resolution: '15 km', candidates: ['bom_access_global'] },
  { id: 'gem', name: 'GEM', provider: 'Environment Canada', resolution: '15 km', candidates: ['gem_global', 'gem_seamless'] },
]

const KMA_FALLBACK = {
  id: 'kma',
  name: 'KMA GDPS',
  provider: 'Korea Meteorological Administration',
  resolution: '12 km',
  candidates: ['kma_gdps'],
}

const HOURLY_VARIABLES = [
  'temperature_2m',
  'relative_humidity_2m',
  'precipitation',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
]

const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/forecast.json')
const generatedAt = new Date().toISOString()

const compactError = (error) => String(error instanceof Error ? error.message : error).replaceAll(/\s+/g, ' ').slice(0, 180)

const fetchJson = async (url, options = {}) => {
  let latestError
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(25_000) })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return await response.json()
    } catch (error) {
      latestError = error
      if (attempt < 2) await new Promise((resolvePromise) => setTimeout(resolvePromise, 750 * attempt))
    }
  }
  throw latestError
}

const nullableNumber = (value) => isFiniteNumber(value) ? value : null

const normalizeOpenMeteo = (hourly) => {
  if (!hourly?.time?.length) return []
  return hourly.time.map((time, index) => ({
    time,
    temperature: nullableNumber(hourly.temperature_2m?.[index]),
    rain: nullableNumber(hourly.precipitation?.[index]),
    humidity: nullableNumber(hourly.relative_humidity_2m?.[index]),
    windSpeed: nullableNumber(hourly.wind_speed_10m?.[index]),
    windDirection: nullableNumber(hourly.wind_direction_10m?.[index]),
    windGust: nullableNumber(hourly.wind_gusts_10m?.[index]),
    cloudCover: nullableNumber(hourly.cloud_cover?.[index]),
    pressure: nullableNumber(hourly.pressure_msl?.[index]),
    weatherCode: nullableNumber(hourly.weather_code?.[index]),
  }))
}

const fetchOpenMeteoModel = async (definition) => {
  const errors = []
  for (const candidate of definition.candidates) {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(LOCATION.latitude))
    url.searchParams.set('longitude', String(LOCATION.longitude))
    url.searchParams.set('hourly', HOURLY_VARIABLES.join(','))
    url.searchParams.set('forecast_days', '10')
    url.searchParams.set('timezone', LOCATION.timezone)
    url.searchParams.set('wind_speed_unit', 'kmh')
    url.searchParams.set('models', candidate)

    try {
      const payload = await fetchJson(url)
      const hourly = normalizeOpenMeteo(payload.hourly)
      if (hourly.length < 24) throw new Error(`only ${hourly.length} forecast hours returned`)
      return {
        id: definition.id,
        name: definition.name,
        provider: definition.provider,
        resolution: definition.resolution,
        independentVote: true,
        status: hourly.length >= 72 ? 'operational' : 'degraded',
        updatedAt: generatedAt,
        hourly,
      }
    } catch (error) {
      errors.push(`${candidate}: ${compactError(error)}`)
    }
  }

  return {
    id: definition.id,
    name: definition.name,
    provider: definition.provider,
    resolution: definition.resolution,
    independentVote: true,
    status: 'unavailable',
    updatedAt: generatedAt,
    error: errors.join('; '),
    hourly: [],
  }
}

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LOCATION.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const toLocalIso = (iso) => {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

const yrWeatherCode = (symbol = '') => {
  if (symbol.includes('thunder')) return 95
  if (symbol.includes('snow')) return 71
  if (symbol.includes('sleet')) return 66
  if (symbol.includes('rain')) return symbol.includes('heavy') ? 65 : 61
  if (symbol.includes('fog')) return 45
  if (symbol.includes('cloudy')) return 3
  if (symbol.includes('partlycloudy')) return 2
  if (symbol.includes('fair')) return 1
  return 0
}

const fetchYr = async () => {
  const url = new URL('https://api.met.no/weatherapi/locationforecast/2.0/compact')
  url.searchParams.set('lat', String(LOCATION.latitude))
  url.searchParams.set('lon', String(LOCATION.longitude))
  url.searchParams.set('altitude', '13')
  const repository = process.env.GITHUB_REPOSITORY
  const projectUrl = repository ? `https://github.com/${repository}` : 'https://github.com/'

  try {
    const payload = await fetchJson(url, {
      headers: {
        'User-Agent': `BlenheimForecast/1.0 (${projectUrl})`,
        Accept: 'application/json',
      },
    })
    const hourly = (payload.properties?.timeseries ?? []).map((entry) => {
      const details = entry.data?.instant?.details ?? {}
      const nextHour = entry.data?.next_1_hours ?? entry.data?.next_6_hours ?? {}
      return {
        time: toLocalIso(entry.time),
        temperature: nullableNumber(details.air_temperature),
        rain: nullableNumber(nextHour.details?.precipitation_amount),
        humidity: nullableNumber(details.relative_humidity),
        windSpeed: isFiniteNumber(details.wind_speed) ? details.wind_speed * 3.6 : null,
        windDirection: nullableNumber(details.wind_from_direction),
        windGust: isFiniteNumber(details.wind_speed_of_gust) ? details.wind_speed_of_gust * 3.6 : null,
        cloudCover: nullableNumber(details.cloud_area_fraction),
        pressure: nullableNumber(details.air_pressure_at_sea_level),
        weatherCode: yrWeatherCode(nextHour.summary?.symbol_code),
      }
    })

    if (hourly.length < 24) throw new Error(`only ${hourly.length} forecast hours returned`)
    return {
      id: 'yr',
      name: 'Yr / MET Norway',
      provider: 'MET Norway',
      resolution: 'ECMWF-derived',
      independentVote: false,
      status: hourly.length >= 72 ? 'operational' : 'degraded',
      updatedAt: generatedAt,
      error: 'Shown for comparison; excluded from consensus to avoid counting ECMWF twice.',
      hourly,
    }
  } catch (error) {
    return {
      id: 'yr',
      name: 'Yr / MET Norway',
      provider: 'MET Norway',
      resolution: 'ECMWF-derived',
      independentVote: false,
      status: 'unavailable',
      updatedAt: generatedAt,
      error: compactError(error),
      hourly: [],
    }
  }
}

const links = [
  { name: 'Yr', url: 'https://www.yr.no/en/forecast/daily-table/2-6243926/New%20Zealand/Marlborough/Marlborough%20District/Blenheim' },
  { name: 'Ventusky', url: 'https://www.ventusky.com/air-pressure-map#p=-41.80;176.44;6' },
  { name: 'Weather Underground', url: 'https://www.wunderground.com/weather/nz/blenheim' },
  { name: 'MetService', url: 'https://www.metservice.com/towns-cities/regions/marlborough/locations/blenheim' },
  { name: 'NIWA', url: 'https://weather.niwa.co.nz/Blenheim' },
  { name: 'PredictWind', url: 'https://www.predictwind.com/weather/new-zealand/marlborough-region/blenheim' },
]

const run = async () => {
  const modelResults = await Promise.all(MODEL_DEFINITIONS.map(fetchOpenMeteoModel))
  const access = modelResults.find((model) => model.id === 'access')
  if (access?.status === 'unavailable') modelResults.push(await fetchOpenMeteoModel(KMA_FALLBACK))
  const yr = await fetchYr()
  const models = [...modelResults, yr]
  const operationalIndependent = models.filter((model) => model.independentVote && model.status !== 'unavailable')
  if (operationalIndependent.length < 3) {
    throw new Error(`Only ${operationalIndependent.length} independent forecast models are available; refusing to publish a weak consensus.`)
  }

  const hourly = buildConsensus(models)
  if (hourly.length < 24) throw new Error(`Consensus produced only ${hourly.length} hourly points.`)
  const daily = buildDailyForecast(hourly)
  const nowLocal = toLocalIso(generatedAt).slice(0, 13)
  const current = hourly.find((point) => point.time.slice(0, 13) >= nowLocal) ?? hourly[0]

  const bundle = {
    schemaVersion: 1,
    generatedAt,
    isDemo: false,
    location: LOCATION,
    attribution: [
      'Model data delivered by Open-Meteo under CC BY 4.0',
      'Yr comparison data: MET Norway under CC BY 4.0',
      'Non-commercial forecast guidance; not an official warning service',
    ],
    current,
    hourly,
    daily,
    models,
    modelSummaries: buildModelSummaries(models, hourly),
    confidence: buildConfidence(hourly, models, MODEL_DEFINITIONS.length),
    rainAnalysis: buildRainAnalysis(hourly),
    vineyardConditions: buildVineyardConditions(hourly),
    accuracy: buildAccuracyMetrics(models),
    links,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')
  const names = operationalIndependent.map((model) => model.name).join(', ')
  process.stdout.write(`Wrote ${outputPath} from ${operationalIndependent.length} independent models: ${names}\n`)
}

run().catch((error) => {
  process.stderr.write(`Forecast update failed: ${compactError(error)}\n`)
  process.exitCode = 1
})
