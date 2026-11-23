import { useEffect, useState } from 'react'
import { signOut, useQuery } from 'deepspace'
import { Check, ChevronDown, LogOut, Pencil, X } from 'lucide-react'
import { Badge, Avatar, AvatarFallback, AvatarImage, Button, Input, Textarea } from './ui'
import { callAction } from '@/lib/actions'
import { AVAILABILITY, SKILLS, parseList, type Profile } from '@/openspot'

type ProfileMenuUser = {
  id: string
  name?: string | null
  email?: string | null
  imageUrl?: string | null
}

export default function ProfileMenu({ user }: { user: ProfileMenuUser }) {
  const profileQuery = useQuery<Profile>('profiles', { where: { userId: user.id }, limit: 1 })
  const profile = (profileQuery.records[0] as { data: Profile } | undefined)?.data
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(!profile)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [availability, setAvailability] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(profile?.displayName ?? '')
    setBio(profile?.bio ?? '')
    setSkills(parseList(profile?.skills))
    setAvailability(parseList(profile?.availability))
    if (profile) setEditing(false)
  }, [profile?.displayName, profile?.bio, profile?.skills, profile?.availability])

  function toggle(value: string, values: string[], setValues: (next: string[]) => void) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await callAction('saveProfile', { displayName: name, bio, skills, availability })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  const displayName = user.name || user.email || 'Profile'

  return <div className="relative">
    <button type="button" aria-label="Open profile" data-testid="nav-profile-button" onClick={() => setOpen((value) => !value)} className="group flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-card">
      <Avatar className="h-6 w-6 ring-1 ring-inset ring-border"><AvatarImage src={user.imageUrl ?? undefined} referrerPolicy="no-referrer" /><AvatarFallback className="text-[11px]">{displayName[0]?.toUpperCase() ?? '?'}</AvatarFallback></Avatar>
      <span data-testid="nav-user-name" className="max-w-[140px] truncate text-foreground">{displayName}</span>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
    </button>
    {open && <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-xl">
      {editing ? <div>
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{profile ? 'Edit your profile' : 'Create your profile'}</p><p className="mt-1 text-xs text-muted-foreground">Keep your teammate card current.</p></div>{profile && <button type="button" aria-label="Close profile editor" className="text-muted-foreground hover:text-foreground" onClick={() => setEditing(false)}><X className="size-4" aria-hidden /></button>}</div>
        <div className="mt-4 grid gap-3"><Input aria-label="Display name" placeholder="Display name" value={name} onChange={(event) => setName(event.target.value)} /><Textarea aria-label="Short bio" placeholder="What are you hoping to build?" value={bio} onChange={(event) => setBio(event.target.value)} className="min-h-20" /><TagPicker label="Skills" values={skills} options={SKILLS} onToggle={(value) => toggle(value, skills, setSkills)} /><TagPicker label="Availability" values={availability} options={AVAILABILITY} onToggle={(value) => toggle(value, availability, setAvailability)} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button loading={saving} onClick={save}>Save profile <Check aria-hidden /></Button></div>
      </div> : <div>
        <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><Avatar className="h-11 w-11 bg-primary/15 text-primary"><AvatarFallback>{profile?.displayName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback></Avatar><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your profile</p><p className="font-semibold text-foreground">{profile?.displayName}</p></div></div><Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil aria-hidden /> Edit</Button></div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{profile?.bio || 'Add a short bio so builders know what you want to make.'}</p><div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</p><div className="flex flex-wrap gap-2">{parseList(profile?.skills).map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div></div><div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Availability</p><div className="flex flex-wrap gap-2">{parseList(profile?.availability).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div></div>
      </div>}
      <div className="mt-4 border-t border-border pt-3"><p data-testid="nav-user-email" className="mb-2 truncate text-xs text-muted-foreground">{user.email}</p><button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => signOut()}><LogOut className="size-4" aria-hidden /> Sign out</button></div>
    </div>}
  </div>
}

function TagPicker({ label, values, options, onToggle }: { label: string; values: string[]; options: readonly string[]; onToggle: (value: string) => void }) {
  return <div><p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p><div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" onClick={() => onToggle(option)} className={`rounded-full border px-3 py-1.5 text-xs transition ${values.includes(option) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'}`}>{option}</button>)}</div></div>
}
