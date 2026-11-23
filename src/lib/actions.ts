import { getAuthToken } from 'deepspace'

export type AppActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function callAction<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken()
  const response = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  })
  const result = (await response.json().catch(() => null)) as AppActionResult<T> | { error?: string } | null
  if (!response.ok || !result || !('success' in result) || !result.success) {
    throw new Error((result && 'error' in result && result.error) || `Request failed (${response.status})`)
  }
  return result.data
}
