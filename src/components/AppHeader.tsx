import { CloudSun, RefreshCw } from 'lucide-react'
import { formatUpdatedTime } from '../lib/weather'

interface AppHeaderProps {
  generatedAt: string
  loading: boolean
  onRefresh: () => void
}

const navItems = [
  { label: 'Forecast', href: '#forecast' },
  { label: 'Wind', href: '#wind' },
  { label: 'Models', href: '#models' },
  { label: 'Vineyard', href: '#vineyard' },
  { label: 'Accuracy', href: '#accuracy' },
]

export function AppHeader({ generatedAt, loading, onRefresh }: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="#forecast" aria-label="Blenheim Forecast home">
        <span className="brand-mark"><CloudSun size={22} strokeWidth={1.8} /></span>
        <span>Blenheim Forecast</span>
      </a>
      <nav className="main-nav" aria-label="Primary navigation">
        {navItems.map((item, index) => (
          <a key={item.href} className={index === 0 ? 'active' : ''} href={item.href}>{item.label}</a>
        ))}
      </nav>
      <div className="header-status">
        <span>Updated {formatUpdatedTime(generatedAt)}</span>
        <button className="icon-button" type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh forecast">
          <RefreshCw size={17} className={loading ? 'spin' : ''} />
        </button>
      </div>
    </header>
  )
}
