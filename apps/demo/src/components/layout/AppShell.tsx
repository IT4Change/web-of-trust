import { Outlet, useLocation } from 'react-router-dom'
import { Navigation } from './Navigation'

const FULLSCREEN_ROUTES = ['/network']

export function AppShell() {
  const { pathname } = useLocation()
  const fullscreen = FULLSCREEN_ROUTES.some(r => pathname.startsWith(r))

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      {fullscreen ? (
        <main className="flex-1 overflow-hidden md:order-2 relative">
          <Outlet />
        </main>
      ) : (
        <main className="flex-1 overflow-auto md:order-2 relative">
          <div className="max-w-2xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      )}
      <Navigation />
    </div>
  )
}
