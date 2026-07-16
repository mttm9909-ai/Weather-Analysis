import { useCallback, useEffect, useState } from 'react'
import { demoForecast } from '../data/demo'
import type { ForecastBundle } from '../types/weather'

interface ForecastState {
  data: ForecastBundle
  loading: boolean
  error: string | null
}

export const useForecast = () => {
  const [state, setState] = useState<ForecastState>({
    data: demoForecast,
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const response = await fetch(`./data/forecast.json?ts=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Forecast feed returned ${response.status}`)
      const data = await response.json() as ForecastBundle
      if (data.schemaVersion !== 1 || !Array.isArray(data.hourly) || data.hourly.length === 0) {
        throw new Error('Forecast feed did not match the expected schema')
      }
      setState({ data, loading: false, error: null })
    } catch (error) {
      setState({
        data: demoForecast,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load the forecast feed',
      })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, refresh: load }
}
