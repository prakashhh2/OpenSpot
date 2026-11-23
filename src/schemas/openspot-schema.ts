import type { CollectionSchema } from 'deepspace/schema'

const privateToMembers = {
  '*': { read: false, create: false, update: false, delete: false },
  viewer: { read: false, create: false, update: false, delete: false },
  member: { read: true, create: false, update: false, delete: false },
  admin: { read: true, create: false, update: false, delete: false },
}

export const profilesSchema: CollectionSchema = {
  name: 'profiles',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true, required: true },
    { name: 'displayName', storage: 'text', interpretation: 'plain', required: true, maxLength: 40 },
    { name: 'skills', storage: 'text', interpretation: { kind: 'multiselect', options: ['React', 'Python', 'Design', 'Product', 'Solana', 'AI'] } },
    { name: 'availability', storage: 'text', interpretation: { kind: 'multiselect', options: ['Friday evening', 'Saturday morning', 'Saturday afternoon', 'Sunday'] } },
    { name: 'bio', storage: 'text', interpretation: 'plain', maxLength: 240 },
  ],
  uniqueOn: ['userId'],
  ownerField: 'userId',
  permissions: privateToMembers,
}

export const teamsSchema: CollectionSchema = {
  name: 'teams',
  columns: [
    { name: 'name', storage: 'text', interpretation: 'plain', required: true, maxLength: 50 },
    { name: 'idea', storage: 'text', interpretation: 'plain', required: true, maxLength: 240 },
    { name: 'skillsNeeded', storage: 'text', interpretation: { kind: 'multiselect', options: ['React', 'Python', 'Design', 'Product', 'Solana', 'AI'] } },
    { name: 'track', storage: 'text', interpretation: { kind: 'select', options: ['AI & data', 'Climate & community', 'Creative tools', 'Open track'] }, required: true },
    { name: 'capacity', storage: 'number', interpretation: 'plain', required: true },
    { name: 'captainId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true, required: true },
  ],
  ownerField: 'captainId',
  permissions: privateToMembers,
}

export const teamMembersSchema: CollectionSchema = {
  name: 'team_members',
  columns: [
    { name: 'teamId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true, required: true },
    { name: 'slot', storage: 'number', interpretation: 'plain', required: true, immutable: true },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['active'] }, default: 'active', immutable: true },
  ],
  uniqueOn: ['userId'],
  permissions: privateToMembers,
}

export const invitesSchema: CollectionSchema = {
  name: 'invites',
  columns: [
    { name: 'teamId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'captainId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'inviteeId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'participants', storage: 'text', interpretation: { kind: 'json' }, required: true },
    { name: 'slot', storage: 'number', interpretation: 'plain', required: true },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['pending', 'accepted', 'declined'] }, required: true },
    { name: 'createdAt', storage: 'text', interpretation: { kind: 'datetime' }, required: true },
  ],
  // Status is part of the key so declined invitations can be sent again.
  // The slot key is the capacity reservation: only one pending invite can own
  // a spot, even when two captain requests race.
  uniqueOn: ['teamId', 'slot', 'status'],
  collaboratorsField: 'participants',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: 'shared', create: false, update: false, delete: false },
    admin: { read: 'shared', create: false, update: false, delete: false },
  },
}

export const teamMessagesSchema: CollectionSchema = {
  name: 'team_messages',
  columns: [
    { name: 'teamId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'senderId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true, required: true },
    { name: 'text', storage: 'text', interpretation: 'plain', required: true, maxLength: 500 },
    { name: 'sentAt', storage: 'text', interpretation: { kind: 'datetime' }, required: true, immutable: true },
  ],
  teamField: 'teamId',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: 'team', create: false, update: false, delete: false },
    admin: { read: 'team', create: false, update: false, delete: false },
  },
}
