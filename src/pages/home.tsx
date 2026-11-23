import { Navigate } from 'react-router-dom'

/** Compatibility redirect for the dashboard's former URL. */
export default function LegacyDashboardRedirect() {
  return <Navigate to="/dashboard" replace />
}
