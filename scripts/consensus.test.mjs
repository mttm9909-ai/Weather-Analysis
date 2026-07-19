import assert from 'node:assert/strict'
import test from 'node:test'
import {
  angularDifference,
  buildConsensus,
  buildVineyardConditions,
  combineWindVectors,
  median,
} from './consensus.mjs'

test('direction differences use the shortest path around north', () => {
  assert.equal(angularDifference(350, 10), 20)
  assert.equal(angularDifference(10, 350), 20)
  assert.equal(angularDifference(90, 270), 180)
})

test('median is robust to outliers and nulls', () => {
  assert.equal(median([10, 11, 12, 99, null]), 11.5)
})

test('wind vector consensus crosses north correctly', () => {
  const result = combineWindVectors([
    { speed: 20, direction: 350 },
    { speed: 20, direction: 10 },
  ])
  assert.ok(result.direction < 1 || result.direction > 359)
  assert.ok(result.speed > 19)
})

test('opposing wind predictions reduce consensus speed', () => {
  const result = combineWindVectors([
    { speed: 20, direction: 90 },
    { speed: 20, direction: 270 },
  ])
  assert.ok(result.speed < 0.001)
})

const point = (overrides = {}) => ({
  time: '2026-07-16T12:00',
  temperature: 12,
  rain: 0,
  humidity: 70,
  windSpeed: 10,
  windDirection: 350,
  windGust: 18,
  cloudCover: 30,
  pressure: 1018,
  weatherCode: 1,
  ...overrides,
})

test('non-independent comparison sources never get a consensus vote', () => {
  const models = [
    { independentVote: true, status: 'operational', hourly: [point()] },
    { independentVote: true, status: 'operational', hourly: [point({ temperature: 14, windDirection: 10 })] },
    { independentVote: false, status: 'operational', hourly: [point({ temperature: 40, windDirection: 180 })] },
  ]
  const [consensus] = buildConsensus(models)
  assert.equal(consensus.temperature, 13)
  assert.ok(consensus.windDirection < 1 || consensus.windDirection > 359)
  assert.equal(consensus.sourceCount, 2)
})

test('sustained wind uses the historically validated model trio', () => {
  const models = [
    { id: 'ecmwf', independentVote: true, status: 'operational', hourly: [point({ windSpeed: 20, windDirection: 0 })] },
    { id: 'gfs', independentVote: true, status: 'operational', hourly: [point({ windSpeed: 20, windDirection: 0 })] },
    { id: 'ukmo', independentVote: true, status: 'operational', hourly: [point({ windSpeed: 20, windDirection: 0 })] },
    { id: 'icon', independentVote: true, status: 'operational', hourly: [point({ windSpeed: 80, windDirection: 180 })] },
    { id: 'gem', independentVote: true, status: 'operational', hourly: [point({ windSpeed: 80, windDirection: 180 })] },
  ]
  const [consensus] = buildConsensus(models)
  assert.equal(consensus.windSpeed, 20)
  assert.equal(consensus.windDirection, 0)
  assert.equal(consensus.sourceCount, 5)
  assert.equal(consensus.spread.windSpeedMax, 80)
})

test('spray guidance requires low wind and gusts for all six hours', () => {
  const hourly = Array.from({ length: 72 }, (_, index) => point({
    time: `2026-07-${String(16 + Math.floor(index / 24)).padStart(2, '0')}T${String(index % 24).padStart(2, '0')}:00`,
    temperature: 8,
    windSpeed: index < 5 ? 9 : 18,
    windGust: index < 5 ? 20 : 30,
    rainAgreement: 0,
  }))
  const spray = buildVineyardConditions(hourly).find((condition) => condition.id === 'spray')
  assert.equal(spray.value, 'No clear window')
})
