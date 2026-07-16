import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Snowflake,
  Sun,
} from 'lucide-react'
import { weatherIconKind } from '../lib/weather'

interface WeatherGlyphProps {
  code: number
  size?: number
  className?: string
}

export function WeatherGlyph({ code, size = 28, className }: WeatherGlyphProps) {
  const props = { size, strokeWidth: 1.65, className, 'aria-hidden': true }
  const kind = weatherIconKind(code)
  if (kind === 'sun') return <Sun {...props} />
  if (kind === 'partly-cloudy') return <CloudSun {...props} />
  if (kind === 'rain') return <CloudRain {...props} />
  if (kind === 'fog') return <CloudFog {...props} />
  if (kind === 'snow') return <Snowflake {...props} />
  if (kind === 'storm') return <CloudLightning {...props} />
  return <Cloud {...props} />
}
