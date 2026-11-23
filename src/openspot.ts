export const SKILLS = ['React', 'Python', 'Design', 'Product', 'Solana', 'AI'] as const
export const AVAILABILITY = ['Friday evening', 'Saturday morning', 'Saturday afternoon', 'Sunday'] as const
export const TRACKS = ['AI & data', 'Climate & community', 'Creative tools', 'Open track'] as const

export type Skill = (typeof SKILLS)[number]
export type Availability = (typeof AVAILABILITY)[number]
export type Track = (typeof TRACKS)[number]

export interface Profile {
  [key: string]: unknown
  userId: string
  displayName: string
  skills: string
  availability: string
  bio: string
}

export interface Team {
  [key: string]: unknown
  name: string
  idea: string
  skillsNeeded: string
  track: Track
  capacity: number
  captainId: string
}

export interface TeamMember {
  [key: string]: unknown
  teamId: string
  userId: string
  slot: number
  status: 'active'
}

export interface Invite {
  [key: string]: unknown
  teamId: string
  captainId: string
  inviteeId: string
  participants: string
  slot: number
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export interface TeamMessage {
  [key: string]: unknown
  teamId: string
  senderId: string
  text: string
  sentAt: string
}

export function parseList(value: string | undefined): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}
