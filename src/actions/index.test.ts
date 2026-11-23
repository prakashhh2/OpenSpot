import { describe, expect, it } from 'vitest'
import { actions } from './index'

type Row = { recordId: string; data: Record<string, unknown> }

function fakeTools(initial: Record<string, Row[]> = {}) {
  const seed: Record<string, Row[]> = { profiles: [], teams: [], team_members: [], invites: [], team_messages: [], ...initial }
  const rows: Record<string, Row[]> = Object.fromEntries(Object.entries(seed).map(([collection, records]) => [collection, records.map((row) => ({ recordId: row.recordId, data: { ...row.data } }))]))
  const tools = {
    get: async (collection: string, recordId: string) => {
      const record = rows[collection]?.find((row) => row.recordId === recordId)
      return record ? { success: true as const, data: { record } } : { success: false as const, error: 'missing' }
    },
    query: async (collection: string, options?: { where?: Record<string, unknown> }) => {
      const records = (rows[collection] ?? []).filter((row) => Object.entries(options?.where ?? {}).every(([key, value]) => row.data[key] === value))
      return { success: true as const, data: { records, count: records.length } }
    },
    create: async (collection: string, data: Record<string, unknown>, recordId?: string) => {
      if (collection === 'team_members' && rows[collection].some((row) => row.data.userId === data.userId)) return { success: false as const, error: 'duplicate' }
      if (collection === 'invites' && rows[collection].some((row) => row.data.teamId === data.teamId && row.data.slot === data.slot && row.data.status === data.status)) return { success: false as const, error: 'duplicate' }
      const id = recordId ?? `${collection}-${rows[collection].length + 1}`
      rows[collection].push({ recordId: id, data })
      return { success: true as const, data: { recordId: id } }
    },
    update: async (collection: string, recordId: string, data: Record<string, unknown>) => {
      const row = rows[collection].find((item) => item.recordId === recordId)
      if (!row) return { success: false as const, error: 'missing' }
      Object.assign(row.data, data)
      return { success: true as const, data: { recordId } }
    },
    remove: async (collection: string, recordId: string) => {
      const index = rows[collection].findIndex((row) => row.recordId === recordId)
      if (index < 0) return { success: false as const, error: 'missing' }
      rows[collection].splice(index, 1)
      return { success: true as const, data: { recordId } }
    },
  }
  return tools
}

const team = { recordId: 'team-1', data: { name: 'Lake Effect', idea: 'A weather app', skillsNeeded: JSON.stringify(['React']), capacity: 2, captainId: 'captain' } }
const invite = { recordId: 'invite-1', data: { teamId: 'team-1', captainId: 'captain', inviteeId: 'builder', participants: JSON.stringify(['captain', 'builder']), slot: 1, status: 'pending', createdAt: '2026-11-22T00:00:00.000Z' } }

describe('OpenSpot actions', () => {
  it('requires university and photo data when saving a profile', async () => {
    const tools = fakeTools()
    const result = await actions.saveProfile({
      userId: 'builder',
      params: { displayName: 'Builder', skills: ['React'], availability: ['Sunday'] },
      tools: tools as never,
      env: {} as never,
      callerJwt: '',
    })
    expect(result).toEqual({ success: false, error: 'Add your name, university, profile photo, at least one skill, and at least one availability window.' })
  })

  it('refuses invite acceptance by anyone except the intended recipient', async () => {
    const tools = fakeTools({ invites: [invite], teams: [team] })
    const result = await actions.respondToInvite({ userId: 'intruder', params: { inviteId: 'invite-1', decision: 'accept' }, tools: tools as never, env: {} as never, callerJwt: '' })
    expect(result).toEqual({ success: false, error: 'Only the invited participant can respond.' })
  })

  it('keeps duplicate acceptance requests to one membership', async () => {
    const tools = fakeTools({ invites: [invite], teams: [team], team_members: [{ recordId: 'captain-row', data: { teamId: 'team-1', userId: 'captain', slot: 0, status: 'active' } }] })
    const context = { userId: 'builder', params: { inviteId: 'invite-1', decision: 'accept' }, tools: tools as never, env: {} as never, callerJwt: '' }
    const results = await Promise.all([actions.respondToInvite(context), actions.respondToInvite(context)])
    expect(results.filter((result) => result.success)).toHaveLength(1)
    expect((await tools.query('team_members', { where: { userId: 'builder' } })).data.records).toHaveLength(1)
  })

  it('refuses a second pending invite for the same team and participant', async () => {
    const tools = fakeTools({ teams: [team], profiles: [{ recordId: 'builder', data: { userId: 'builder' } }], team_members: [{ recordId: 'captain-row', data: { teamId: 'team-1', userId: 'captain', slot: 0, status: 'active' } }] })
    const context = { userId: 'captain', params: { teamId: 'team-1', inviteeId: 'builder' }, tools: tools as never, env: {} as never, callerJwt: '' }
    expect((await actions.sendInvite(context)).success).toBe(true)
    expect((await actions.sendInvite(context)).success).toBe(false)
  })

  it('reserves the last spot when two captain requests race', async () => {
    const tools = fakeTools({
      teams: [team],
      profiles: [{ recordId: 'a', data: { userId: 'a' } }, { recordId: 'b', data: { userId: 'b' } }],
      team_members: [{ recordId: 'captain-row', data: { teamId: 'team-1', userId: 'captain', slot: 0, status: 'active' } }],
    })
    const makeContext = (inviteeId: string) => ({ userId: 'captain', params: { teamId: 'team-1', inviteeId }, tools: tools as never, env: {} as never, callerJwt: '' })
    const results = await Promise.all([actions.sendInvite(makeContext('a')), actions.sendInvite(makeContext('b'))])
    expect(results.filter((result) => result.success)).toHaveLength(1)
  })

  it('allows a participant to join at most one team under concurrent accepts', async () => {
    const secondTeam = { ...team, recordId: 'team-2', data: { ...team.data, name: 'Second Team', captainId: 'other-captain' } }
    const secondInvite = { ...invite, recordId: 'invite-2', data: { ...invite.data, teamId: 'team-2', captainId: 'other-captain' } }
    const tools = fakeTools({ invites: [invite, secondInvite], teams: [team, secondTeam], team_members: [
      { recordId: 'captain-row', data: { teamId: 'team-1', userId: 'captain', slot: 0, status: 'active' } },
      { recordId: 'other-captain-row', data: { teamId: 'team-2', userId: 'other-captain', slot: 0, status: 'active' } },
    ] })
    const makeContext = (inviteId: string) => ({ userId: 'builder', params: { inviteId, decision: 'accept' }, tools: tools as never, env: {} as never, callerJwt: '' })
    const results = await Promise.all([actions.respondToInvite(makeContext('invite-1')), actions.respondToInvite(makeContext('invite-2'))])
    expect(results.filter((result) => result.success)).toHaveLength(1)
    expect((await tools.query('team_members', { where: { userId: 'builder' } })).data.records).toHaveLength(1)
  })

  it('keeps team chat writes private to current members', async () => {
    const tools = fakeTools({ team_members: [{ recordId: 'captain-row', data: { teamId: 'team-1', userId: 'captain', slot: 0, status: 'active' } }] })
    const result = await actions.sendMessage({ userId: 'outsider', params: { teamId: 'team-1', text: 'hello' }, tools: tools as never, env: {} as never, callerJwt: '' })
    expect(result).toEqual({ success: false, error: 'Only current team members can send messages.' })
  })

  it('lets the captain remove an active teammate and cancels their pending invite', async () => {
    const tools = fakeTools({
      teams: [team],
      team_members: [
        { recordId: 'captain-row', data: { teamId: 'team-1', userId: 'captain', slot: 0, status: 'active' } },
        { recordId: 'builder-row', data: { teamId: 'team-1', userId: 'builder', slot: 1, status: 'active' } },
      ],
      invites: [invite],
    })
    const result = await actions.removeTeamMember({ userId: 'captain', params: { teamId: 'team-1', memberId: 'builder' }, tools: tools as never, env: {} as never, callerJwt: '' })
    expect(result).toEqual({ success: true, data: { teamId: 'team-1', memberId: 'builder' } })
    expect((await tools.query('team_members', { where: { teamId: 'team-1', userId: 'builder' } })).data.records).toHaveLength(0)
    expect((await tools.query('invites', { where: { teamId: 'team-1', inviteeId: 'builder' } })).data.records[0].data.status).toBe('declined')
  })

  it('rejects member removal by a non-captain', async () => {
    const tools = fakeTools({ teams: [team], team_members: [{ recordId: 'builder-row', data: { teamId: 'team-1', userId: 'builder', slot: 1, status: 'active' } }] })
    const result = await actions.removeTeamMember({ userId: 'builder', params: { teamId: 'team-1', memberId: 'other' }, tools: tools as never, env: {} as never, callerJwt: '' })
    expect(result).toEqual({ success: false, error: 'Only the team captain can remove members.' })
  })
})
