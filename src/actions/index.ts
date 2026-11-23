import type { ActionHandler, ActionResult } from 'deepspace/worker'
import type { Env } from '../../worker'
import { AVAILABILITY, SKILLS, TRACKS, type Invite, type Profile, type Team, type TeamMember, type TeamMessage, type Track } from '../openspot'

const skillSet = new Set<string>(SKILLS)
const availabilitySet = new Set<string>(AVAILABILITY)
const trackSet = new Set<string>(TRACKS)

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const result = value.trim()
  return result && result.length <= max ? result : null
}

function selected(value: unknown, allowed: Set<string>, max: number): string[] | null {
  if (!Array.isArray(value)) return null
  const result = [...new Set(value.filter((item): item is string => typeof item === 'string' && allowed.has(item)))]
  return result.length > 0 && result.length <= max && result.length === value.length ? result : null
}

function fail(error: string): ActionResult<never> {
  return { success: false, error }
}

async function one<T extends Record<string, unknown>>(
  tools: Parameters<ActionHandler<Env>>[0]['tools'],
  collection: string,
  where: Record<string, unknown>,
) {
  const result = await tools.query<T>(collection, { where, limit: 1 })
  return result.success ? result.data.records[0] : undefined
}

const saveProfile: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const displayName = text(params.displayName, 40)
  const university = text(params.university, 100)
  const photoUrl = text(params.photoUrl, 1000)
  const bio = typeof params.bio === 'string' ? params.bio.trim().slice(0, 240) : ''
  const skills = selected(params.skills, skillSet, 5)
  const availability = selected(params.availability, availabilitySet, 4)
  if (!displayName || !university || !photoUrl || !skills || !availability) {
    return fail('Add your name, university, profile photo, at least one skill, and at least one availability window.')
  }

  const data: Profile = {
    userId,
    displayName,
    university,
    photoUrl,
    skills: JSON.stringify(skills),
    availability: JSON.stringify(availability),
    bio,
  }
  const existing = await tools.get<Profile>('profiles', userId)
  if (existing.success) return tools.update('profiles', userId, data)
  return tools.create('profiles', data, userId)
}

const createTeam: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const name = text(params.name, 50)
  const idea = text(params.idea, 240)
  const skillsNeeded = selected(params.skillsNeeded, skillSet, 5)
  const track: Track | null = typeof params.track === 'string' && trackSet.has(params.track) ? params.track as Track : null
  const capacity = params.capacity
  if (!name || !idea || !skillsNeeded || !track || !Number.isInteger(capacity) || Number(capacity) < 2 || Number(capacity) > 6) {
    return fail('Choose a team name, project idea, hackathon track, 1–5 needed skills, and a capacity from 2 to 6.')
  }

  const existing = await one<TeamMember>(tools, 'team_members', { userId, status: 'active' })
  if (existing) return fail('You are already on a team for this event.')

  const team = await tools.create<Team>('teams', {
    name,
    idea,
    skillsNeeded: JSON.stringify(skillsNeeded),
    track,
    capacity: Number(capacity),
    captainId: userId,
  })
  if (!team.success) return team

  const membership = await tools.create<TeamMember>(
    'team_members',
    { teamId: team.data.recordId, userId, slot: 0, status: 'active' },
    `${team.data.recordId}:${userId}`,
  )
  if (!membership.success) {
    await tools.remove('teams', team.data.recordId)
    return fail('Could not reserve your captain spot. Please try again.')
  }
  return { success: true, data: { teamId: team.data.recordId } }
}

const sendInvite: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const teamId = text(params.teamId, 100)
  const inviteeId = text(params.inviteeId, 100)
  if (!teamId || !inviteeId || inviteeId === userId) return fail('Choose a valid participant.')

  const teamResult = await tools.get<Team>('teams', teamId)
  if (!teamResult.success) return fail('Team not found.')
  const team = teamResult.data.record.data
  if (team.captainId !== userId) return fail('Only the team captain can send invites.')
  if (!await one<Profile>(tools, 'profiles', { userId: inviteeId })) return fail('That participant has not created a profile yet.')
  if (await one<TeamMember>(tools, 'team_members', { userId: inviteeId, status: 'active' })) {
    return fail('That participant is already on a team.')
  }
  if (await one<Invite>(tools, 'invites', { teamId, inviteeId, status: 'pending' })) {
    return fail('An invite is already pending for this participant.')
  }

  const members = await tools.query<TeamMember>('team_members', { where: { teamId, status: 'active' }, limit: 500 })
  const pending = await tools.query<Invite>('invites', { where: { teamId, status: 'pending' }, limit: 500 })
  if (!members.success || !pending.success) return fail('Could not check the team roster.')
  const occupied = new Set([
    ...members.data.records.map((row) => row.data.slot),
    ...pending.data.records.map((row) => row.data.slot),
  ])
  const slot = Array.from({ length: Number(team.capacity) - 1 }, (_, index) => index + 1).find((candidate) => !occupied.has(candidate))
  if (slot === undefined) return fail('This team has no available spots.')

  const invite = await tools.create<Invite>('invites', {
    teamId,
    captainId: userId,
    inviteeId,
    participants: JSON.stringify([userId, inviteeId]),
    slot,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
  if (!invite.success) return fail('That spot was just claimed. Refresh and try again.')
  return invite
}

const respondToInvite: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const inviteId = text(params.inviteId, 100)
  const decision = params.decision === 'accept' || params.decision === 'decline' ? params.decision : null
  if (!inviteId || !decision) return fail('Choose accept or decline.')

  const inviteResult = await tools.get<Invite>('invites', inviteId)
  if (!inviteResult.success) return fail('Invite not found.')
  const invite = inviteResult.data.record.data
  if (invite.inviteeId !== userId) return fail('Only the invited participant can respond.')
  if (invite.status !== 'pending') return fail('This invite has already been answered.')
  if (decision === 'decline') return tools.update('invites', inviteId, { status: 'declined' })

  if (await one<TeamMember>(tools, 'team_members', { userId, status: 'active' })) {
    return fail('You already joined another team.')
  }
  const teamResult = await tools.get<Team>('teams', invite.teamId)
  if (!teamResult.success) return fail('This team is no longer available.')
  const team = teamResult.data.record.data
  const members = await tools.query<TeamMember>('team_members', { where: { teamId: invite.teamId, status: 'active' }, limit: 500 })
  if (!members.success || members.data.records.length >= Number(team.capacity)) {
    return fail('This team filled up before you accepted the invite.')
  }
  if (members.data.records.some((row) => row.data.slot === invite.slot)) {
    return fail('This team spot was already claimed.')
  }

  // `team_members.userId` is unique, so retries and two concurrent accepts by
  // one participant cannot create a second membership. Invite slots reserve
  // the remaining capacity before acceptance through `uniqueOn` on invites.
  const membership = await tools.create<TeamMember>(
    'team_members',
    { teamId: invite.teamId, userId, slot: invite.slot, status: 'active' },
    `${invite.teamId}:${userId}`,
  )
  if (!membership.success) return fail('You joined another team first, or this invite was already accepted.')
  const updated = await tools.update('invites', inviteId, { status: 'accepted' })
  if (!updated.success) return fail('You joined the team, but the invite status could not be updated. Refresh and retry.')
  return { success: true, data: { teamId: invite.teamId } }
}

const sendMessage: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const teamId = text(params.teamId, 100)
  const message = text(params.text, 500)
  if (!teamId || !message) return fail('Messages must contain 1–500 characters.')
  if (!await one<TeamMember>(tools, 'team_members', { teamId, userId, status: 'active' })) {
    return fail('Only current team members can send messages.')
  }
  return tools.create<TeamMessage>('team_messages', {
    teamId,
    senderId: userId,
    text: message,
    sentAt: new Date().toISOString(),
  })
}

const removeTeamMember: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const teamId = text(params.teamId, 100)
  const memberId = text(params.memberId, 100)
  if (!teamId || !memberId) return fail('Choose a valid team member.')

  const teamResult = await tools.get<Team>('teams', teamId)
  if (!teamResult.success) return fail('Team not found.')
  const team = teamResult.data.record.data
  if (team.captainId !== userId) return fail('Only the team captain can remove members.')
  if (memberId === team.captainId) return fail('The team captain cannot be removed.')

  const membership = await one<TeamMember>(tools, 'team_members', { teamId, userId: memberId, status: 'active' })
  if (!membership) return fail('That participant is not an active member of this team.')

  const pendingInvites = await tools.query<Invite>('invites', { where: { teamId, inviteeId: memberId, status: 'pending' }, limit: 500 })
  if (!pendingInvites.success) return fail('Could not cancel pending invitations. Please try again.')
  const canceled = await Promise.all(pendingInvites.data.records.map((invite) => tools.update('invites', invite.recordId, { status: 'declined' })))
  if (canceled.some((result) => !result.success)) return fail('Could not cancel pending invitations. Please try again.')

  const removed = await tools.remove('team_members', membership.recordId)
  if (!removed.success) return fail('Could not remove that participant. Please try again.')

  return { success: true, data: { teamId, memberId } }
}

export const actions: Record<string, ActionHandler<Env>> = {
  saveProfile,
  createTeam,
  sendInvite,
  respondToInvite,
  sendMessage,
  removeTeamMember,
}
