/**
 * Top nav — nav.ts-driven links with auth-aware brand, account controls, and
 * a responsive mobile menu. Keep the data-testid hooks: the shipped tests
 * rely on them.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady } from 'deepspace'
import { Menu, X } from 'lucide-react'
import { APP_NAME } from '../constants'
import type { Role } from '../constants'
import { nav } from '../nav'
import { cn } from '../lib/utils'
import ProfileMenu from './ProfileMenu'

function matchesRoute(pathname: string, routePath: string) {
  if (routePath === '/') return pathname === '/'
  return pathname === routePath || pathname.startsWith(`${routePath}/`)
}

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const location = useLocation()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'
  const visibleNav = nav.filter((item) => {
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    if (!profileReady) return false
    if (userRole === 'admin') return true
    return item.roles.includes(userRole as Role)
  })

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!visibleNav.length) setMobileMenuOpen(false)
  }, [visibleNav.length])

  useEffect(() => {
    if (!mobileMenuOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  const navLink = (item: (typeof nav)[number], mobile = false) => {
    const active = matchesRoute(location.pathname, item.path)
    return <Link
      key={item.path}
      to={item.path}
      aria-current={active ? 'page' : undefined}
      onClick={() => mobile && setMobileMenuOpen(false)}
      className={cn(
        mobile
          ? 'rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'rounded-md px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
      )}
    >
      {item.label}
    </Link>
  }

  const brandPath = isLoaded && isSignedIn ? '/dashboard' : '/'

  return <>
    <nav data-testid="app-navigation" className="border-b border-border bg-background">
      <div className="mx-auto flex min-h-12 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <Link to={brandPath} aria-label={`${APP_NAME} home`} className="flex min-w-0 shrink-0 items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/favicon.png" alt="" className="size-7 rounded-lg object-cover" />
          <span className="truncate">{APP_NAME}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">{visibleNav.map((item) => navLink(item))}</div>
        <div className="flex-1" />

        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {visibleNav.length > 0 && <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-secondary hover:text-foreground md:hidden"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-controls="mobile-navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>}

          {!isLoaded ? null : isSignedIn && !profileReady ? (
            <div aria-busy="true" aria-label="Loading account" className="flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-1 pr-2.5">
              <div className="size-6 animate-pulse rounded-full bg-muted" />
              <div className="hidden h-4 w-20 animate-pulse rounded-md bg-muted sm:block" />
            </div>
          ) : isSignedIn && user ? (
            <ProfileMenu user={user} />
          ) : (
            <button
              data-testid="nav-sign-in-button"
              onClick={() => setShowAuthModal(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:opacity-90"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {mobileMenuOpen && visibleNav.length > 0 && <div id="mobile-navigation" className="border-t border-border px-3 py-2 md:hidden"><div className="flex flex-col gap-1">{visibleNav.map((item) => navLink(item, true))}</div></div>}
    </nav>

    {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
  </>
}
