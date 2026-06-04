import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="siis-clock">
      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <div className="siis-app">
      <header className="siis-header">
        <div className="siis-header-left">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="siis-logo-block">
              <span className="siis-logo-tag">SIIS · UNILAB</span>
              <span className="siis-logo-title">MONITOR <span>RU</span></span>
            </div>
          </Link>
          <div className="siis-header-badge">
            <div className="siis-live-dot" />
            TEMPO REAL
          </div>
        </div>

        <div className="siis-header-right">
          <Clock />
        </div>
      </header>

      <nav className="siis-nav" style={{ marginBottom: 24 }}>
        {(
          [
            { to: '/', label: 'INÍCIO' },
            { to: '/schedules', label: 'HORÁRIOS' },
          ] as const
        ).map(({ to, label }) => (
          <Link key={to} to={to} className={`siis-nav-link${isActive(to) ? ' active' : ''}`}>
            {label}
          </Link>
        ))}
      </nav>

      <main>{children}</main>
    </div>
  );
}
