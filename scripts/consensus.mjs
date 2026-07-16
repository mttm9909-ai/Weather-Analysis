const RAIN_THRESHOLD_MM = 0.2

export const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

export const round = (value, places = 1) => {
  const factor = 10 ** places
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export const median = (values) => {
  const valid = values.filter(isFiniteNumber).sort((a, b) => a - b)
  if (!valid.length) return null
  const middle = Math.floor(valid.length / 2)
  return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2
}

const extent = (values, fallback = 0) => {
  const valid = values.filter(isFiniteNumber)
  return valid.length ? [Math.min(...valid), Math.max(...valid)] : [fallback, fallback]
}

const mode = (values) => {
  const valid = values.filter(isFiniteNumber)
  if (!valid.length) return 0
  const counts = new Map()
  valid.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
}

/**
 * Combines meteorological "from" bearings as vectors. This avoids the classic
 * circular-mean bug where 350° and 10° incorrectly average to 180°.
 */
export const combineWindVectors = (samples) => {
  const valid = samples.filter(({ speed, direction }) => isFiniteNumber(speed) && isFiniteNumber(direction))
  if (!valid.length) return { speed: 0, direction: 0 }

  const vectors = valid.map(({ speed, direction }) => {
    const radians = direction * Math.PI / 180
    return {
      east: speed * Math.sin(radians),
      north: speed * Math.cos(radians),
    }
  })
  const east = vectors.reduce((sum, vector) => sum + vector.east, 0) / vectors.length
  const north = vectors.reduce((sum, vector) => sum + vector.north, 0) / vectors.length
  const direction = (Math.atan2(east, north) * 180 / Math.PI + 360) % 360

  return { speed: Math.hypot(east, north), direction }
}

export const angularDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180)

const activeIndependentModels = (models) => models.filter((model) =>
  model.independentVote && model.status !== 'unavailable' && model.hourly.length,
)

export const buildConsensus = (models) => {
  const active = activeIndependentModels(models)
  const pointsByTime = new Map()

  active.forEach((model) => {
    model.hourly.forEach((point) => {
      const values = pointsByTime.get(point.time) ?? []
      values.push(point)
      pointsByTime.set(point.time, values)
    })
  })

  return [...pointsByTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, values]) => {
      const temperatures = values.map((point) => point.temperature)
      const rain = values.map((point) => point.rain)
      const humidity = values.map((point) => point.humidity)
      const gusts = values.map((point) => point.windGust)
      const windSpeeds = values.map((point) => point.windSpeed)
      const wind = combineWindVectors(values.map((point) => ({
        speed: point.windSpeed,
        direction: point.windDirection,
      })))
      const temperature = median(temperatures) ?? 0
      const rainfall = median(rain) ?? 0
      const gust = median(gusts) ?? wind.speed
      const [temperatureMin, temperatureMax] = extent(temperatures, temperature)
      const [rainMin, rainMax] = extent(rain, rainfall)
      const [windSpeedMin, windSpeedMax] = extent(windSpeeds, wind.speed)
      const [windGustMin, windGustMax] = extent(gusts, gust)
      const windDirections = values.map((point) => point.windDirection).filter(isFiniteNumber)
      const windDirectionSpread = windDirections.length
        ? Math.max(...windDirections.map((direction) => angularDifference(direction, wind.direction)))
        : 0
      const validRain = rain.filter(isFiniteNumber)

      return {
        time,
        temperature: round(temperature, 1),
        rain: round(rainfall, 2),
        humidity: Math.round(median(humidity) ?? 0),
        windSpeed: round(wind.speed, 1),
        windDirection: round(wind.direction, 0),
        windGust: round(gust, 1),
        cloudCover: Math.round(median(values.map((point) => point.cloudCover)) ?? 0),
        pressure: round(median(values.map((point) => point.pressure)) ?? 0, 1),
        weatherCode: mode(values.map((point) => point.weatherCode)),
        rainAgreement: validRain.length
          ? Math.round(validRain.filter((value) => value >= RAIN_THRESHOLD_MM).length / validRain.length * 100)
          : 0,
        sourceCount: values.length,
        spread: {
          temperatureMin: round(temperatureMin, 1),
          temperatureMax: round(temperatureMax, 1),
          rainMin: round(rainMin, 2),
          rainMax: round(rainMax, 2),
          windSpeedMin: round(windSpeedMin, 1),
          windSpeedMax: round(windSpeedMax, 1),
          windGustMin: round(windGustMin, 1),
          windGustMax: round(windGustMax, 1),
          windDirectionSpread: round(windDirectionSpread, 0),
        },
      }
    })
    .filter((point) => point.sourceCount >= 2)
}

export const buildDailyForecast = (hourly) => {
  const grouped = new Map()
  hourly.forEach((point) => {
    const date = point.time.slice(0, 10)
    const points = grouped.get(date) ?? []
    points.push(point)
    grouped.set(date, points)
  })

  return [...grouped.entries()].slice(0, 10).map(([date, points]) => {
    const midday = points.find((point) => Number(point.time.slice(11, 13)) === 12)
    const wettest = points.reduce((best, point) => point.rain > best.rain ? point : best, points[0])
    return {
      date,
      weatherCode: wettest.rain >= RAIN_THRESHOLD_MM ? wettest.weatherCode : (midday?.weatherCode ?? mode(points.map((point) => point.weatherCode))),
      temperatureMax: round(Math.max(...points.map((point) => point.temperature)), 1),
      temperatureMin: round(Math.min(...points.map((point) => point.temperature)), 1),
      rainTotal: round(points.reduce((sum, point) => sum + point.rain, 0), 1),
      rainAgreement: Math.max(...points.map((point) => point.rainAgreement)),
      windPeak: round(Math.max(...points.map((point) => point.windGust)), 1),
      sourceCount: Math.max(...points.map((point) => point.sourceCount)),
    }
  })
}

const maxWindow = (points, length, selector) => {
  if (!points.length) return { start: null, end: null, value: 0, index: -1 }
  let best = { start: points[0].time, end: points[Math.min(length - 1, points.length - 1)].time, value: -Infinity, index: 0 }
  for (let index = 0; index <= points.length - length; index += 1) {
    const value = points.slice(index, index + length).reduce((sum, point) => sum + selector(point), 0)
    if (value > best.value) {
      best = { start: points[index].time, end: points[index + length - 1].time, value, index }
    }
  }
  return best
}

export const buildRainAnalysis = (hourly) => {
  const next96 = hourly.slice(0, 96)
  const next72 = next96.slice(0, 72)
  const likely = next72.filter((point) => point.rain >= RAIN_THRESHOLD_MM && point.rainAgreement >= 50)
  const heaviest = maxWindow(next72, 6, (point) => point.rain)
  let dryIndex = -1
  for (let index = 0; index <= next96.length - 12; index += 1) {
    if (next96.slice(index, index + 12).every((point) => point.rain < 0.1 && point.rainAgreement < 50)) {
      dryIndex = index
      break
    }
  }

  return {
    nextRainTime: likely[0]?.time ?? null,
    heaviestStart: heaviest.value >= RAIN_THRESHOLD_MM ? heaviest.start : null,
    heaviestEnd: heaviest.value >= RAIN_THRESHOLD_MM ? heaviest.end : null,
    total72h: round(next72.reduce((sum, point) => sum + point.rain, 0), 1),
    dryWindowStart: dryIndex >= 0 ? next96[dryIndex].time : null,
    dryWindowEnd: dryIndex >= 0 ? next96[dryIndex + 11].time : null,
    peakAgreement: next72.length ? Math.max(...next72.map((point) => point.rainAgreement)) : 0,
  }
}

const windowLabel = (start, end) => {
  const day = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(`${start.slice(0, 10)}T12:00:00Z`))
  return `${day} ${start.slice(11, 16)}–${end.slice(11, 16)}`
}

export const buildVineyardConditions = (hourly) => {
  const next72 = hourly.slice(0, 72)
  const tonight = hourly.slice(0, 18)
  const minimum = Math.min(...tonight.map((point) => point.temperature))
  const frost = minimum <= 0
    ? { value: 'High', level: 'poor', detail: `Consensus falls to ${round(minimum, 1)}°C; protect frost-sensitive blocks.` }
    : minimum <= 2
      ? { value: 'Watch', level: 'moderate', detail: `A minimum near ${round(minimum, 1)}°C leaves limited frost margin.` }
      : { value: 'Low', level: 'good', detail: `Consensus minimum stays near ${round(minimum, 1)}°C.` }

  let sprayIndex = -1
  for (let index = 0; index <= Math.min(48, hourly.length) - 6; index += 1) {
    const window = hourly.slice(index, index + 6)
    if (window.every((point) => point.rain < 0.1 && point.rainAgreement < 35 && point.windSpeed <= 15 && point.windGust <= 25)) {
      sprayIndex = index
      break
    }
  }
  const spray = sprayIndex >= 0
    ? {
        value: windowLabel(hourly[sprayIndex].time, hourly[sprayIndex + 5].time),
        level: 'good',
        detail: 'Six hours with low rain signal, sustained wind ≤15 km/h and gusts ≤25 km/h.',
      }
    : {
        value: 'No clear window',
        level: 'poor',
        detail: 'No six-hour period meets the rain and wind thresholds in the next 48 hours.',
      }

  const gustPeak = Math.max(...next72.map((point) => point.windGust))
  const speedPeak = Math.max(...next72.map((point) => point.windSpeed))
  const wind = gustPeak > 40
    ? { value: 'Strong', level: 'poor', detail: `Peak gusts near ${round(gustPeak)} km/h; sustained wind peaks near ${round(speedPeak)} km/h.` }
    : gustPeak > 25
      ? { value: 'Moderate', level: 'moderate', detail: `Gusts may reach ${round(gustPeak)} km/h; check the 72-hour wind panel before spraying.` }
      : { value: 'Manageable', level: 'good', detail: `Peak gusts stay near ${round(gustPeak)} km/h across the next 72 hours.` }

  const humidityAverage = median(hourly.slice(0, 24).map((point) => point.humidity)) ?? 0
  const humidity = humidityAverage > 90
    ? { value: 'High', level: 'moderate', detail: `Median humidity is ${Math.round(humidityAverage)}% over the next day.` }
    : { value: 'Favourable', level: 'good', detail: `Median humidity is ${Math.round(humidityAverage)}% over the next day.` }

  return [
    { id: 'frost', label: 'Frost risk tonight', ...frost },
    { id: 'spray', label: 'Next spray window', ...spray },
    { id: 'wind', label: 'Wind / gusts', ...wind },
    { id: 'humidity', label: 'Humidity', ...humidity },
  ]
}

export const buildConfidence = (hourly, models, expectedSources) => {
  const next24 = hourly.slice(0, 24)
  const activeSources = activeIndependentModels(models).length
  const averageTemperatureSpread = next24.length
    ? next24.reduce((sum, point) => sum + point.spread.temperatureMax - point.spread.temperatureMin, 0) / next24.length
    : 99
  const averageGustSpread = next24.length
    ? next24.reduce((sum, point) => sum + point.spread.windGustMax - point.spread.windGustMin, 0) / next24.length
    : 99
  const averageDirectionSpread = next24.length
    ? next24.reduce((sum, point) => sum + point.spread.windDirectionSpread, 0) / next24.length
    : 180
  const completeness = expectedSources ? activeSources / expectedSources : 0
  const level = completeness >= 0.75 && averageTemperatureSpread <= 3 && averageGustSpread <= 12 && averageDirectionSpread <= 35
    ? 'high'
    : completeness >= 0.5 && averageTemperatureSpread <= 5 && averageGustSpread <= 20 && averageDirectionSpread <= 70
      ? 'medium'
      : 'low'
  const title = level === 'high' ? 'High model agreement' : level === 'medium' ? 'Mixed model agreement' : 'Low model agreement'

  return {
    level,
    title,
    reason: `${activeSources} independent models contribute. Average 24-hour spread is ${round(averageTemperatureSpread, 1)}°C, ${round(averageGustSpread, 1)} km/h for gusts and ±${round(averageDirectionSpread)}° for wind direction.`,
    temperatureSpread: round(averageTemperatureSpread, 1),
    activeSources,
    expectedSources,
  }
}

const validValues = (points, key) => points.map((point) => point[key]).filter(isFiniteNumber)

export const buildModelSummaries = (models, consensus) => {
  const consensusByTime = new Map(consensus.slice(0, 72).map((point) => [point.time, point]))
  const consensusRain = consensus.slice(0, 72).reduce((sum, point) => sum + point.rain, 0)
  const consensusTemperature = median(consensus.slice(0, 72).map((point) => point.temperature)) ?? 0

  return models.map((model) => {
    const next72 = model.hourly.slice(0, 72)
    if (!next72.length) {
      return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        status: model.status,
        independentVote: model.independentVote,
        temperatureMin: null,
        temperatureMax: null,
        rainTotal72h: null,
        rainPeakTime: null,
        windPeak: null,
        windDirection: null,
        difference: model.error ?? 'No current data',
        trend: [],
      }
    }

    const temperatures = validValues(next72, 'temperature')
    const rains = validValues(next72, 'rain')
    const gusts = validValues(next72, 'windGust')
    const rainPeak = next72.reduce((best, point) => (point.rain ?? -1) > (best.rain ?? -1) ? point : best, next72[0])
    const windPeakPoint = next72.reduce((best, point) => (point.windGust ?? -1) > (best.windGust ?? -1) ? point : best, next72[0])
    const modelRain = rains.reduce((sum, value) => sum + value, 0)
    const modelTemperature = median(temperatures) ?? consensusTemperature
    const matched = next72.filter((point) => consensusByTime.has(point.time))
    const windDifference = matched.length
      ? median(matched.map((point) => isFiniteNumber(point.windGust) ? point.windGust - consensusByTime.get(point.time).windGust : null)) ?? 0
      : 0
    const descriptors = []
    if (modelRain > consensusRain + 2) descriptors.push('wetter')
    if (modelRain < consensusRain - 2) descriptors.push('drier')
    if (modelTemperature > consensusTemperature + 1) descriptors.push('warmer')
    if (modelTemperature < consensusTemperature - 1) descriptors.push('cooler')
    if (windDifference > 4) descriptors.push('windier')
    if (windDifference < -4) descriptors.push('lighter wind')

    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      status: model.status,
      independentVote: model.independentVote,
      temperatureMin: temperatures.length ? round(Math.min(...temperatures), 1) : null,
      temperatureMax: temperatures.length ? round(Math.max(...temperatures), 1) : null,
      rainTotal72h: rains.length ? round(modelRain, 1) : null,
      rainPeakTime: rainPeak.time,
      windPeak: gusts.length ? round(Math.max(...gusts), 1) : null,
      windDirection: windPeakPoint.windDirection,
      difference: descriptors.length ? descriptors.join(', ') : 'Near consensus',
      trend: next72.filter((_, index) => index % 6 === 0).map((point) => point.temperature).filter(isFiniteNumber),
    }
  })
}

export const buildAccuracyPlaceholders = (models) => models
  .filter((model) => model.independentVote)
  .map((model) => ({
    modelId: model.id,
    modelName: model.name,
    verifiedDays: 0,
    temperatureMae: null,
    rainMae: null,
    windMae: null,
  }))
