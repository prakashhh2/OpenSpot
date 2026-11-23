# OpenSpot

OpenSpot is a small DeepSpace app for the fictional **Hack the Lake** hackathon. Participants publish a short builder profile, discover teammates by explicit skills and shared availability, create a team, send invites, accept invites into a live roster, and plan in a private team chat.

## Run locally

```sh
npm install
npx deepspace auth login
npx deepspace dev start
```

Open `http://localhost:8780`. The app uses DeepSpace Auth; no local password database or secret is checked into this repository.

Useful checks:

```sh
npm run type-check
npm run lint
npm run test:unit
npm run build
```

The verified deployment command is `npx deepspace deploy`. Deployment remains intentionally manual: commit first for the default DeepSpace source, then deploy when you are ready.

## Demo path

1. Sign in as participant A and save a profile with skills and availability.
2. Open a second signed-in session for participant B and save a different profile.
3. As A, create a team with a capacity of 2–6, choose a hackathon track, and add the needed tech stack.
4. From Discover, invite B. The invite appears in B’s Invites tab.
5. Accept as B. A’s My team roster updates from the `team_members` realtime subscription without a manual refresh.
6. Open My Team and send a message. Only current members can read or send in that team’s chat.

## DeepSpace pieces used

- DeepSpace Auth provides the verified user session. The server action receives `userId` from that verified JWT; it never trusts a user id from the browser.
- Record schemas in `src/schemas/openspot-schema.ts` describe SQLite-backed collections and server-enforced RBAC. Public profiles contain only discovery fields; invite rows use `collaboratorsField` plus `read: 'shared'` so only captain and recipient receive them.
- `useQuery` creates query-based realtime subscriptions. The UI’s profiles, teams, memberships, and invites are live record queries.
- `src/actions/index.ts` contains the cross-record server actions. `src/server/action-routes.ts` already authenticates them and provides privileged record tools; each action still performs its own ownership and recipient checks because action tools bypass collection RBAC.
- `team_messages` uses `teamField: 'teamId'` and `read: 'team'` for private access. The `sendMessage` action validates length and current membership before writing; the installed public Messaging feature is intentionally not used because its built-in channels are public.

## Record layout and capacity invariant

- `profiles`: one row per user, keyed by `userId`; skills and availability are JSON strings because DeepSpace columns are typed SQLite `text`/`number` values.
- `teams`: captain, idea, hackathon track, needed tech stack, and capacity.
- `team_members`: active roster rows. `uniqueOn: ['userId']` enforces one team per participant at the record layer.
- `invites`: sender, recipient, status, and a reserved `slot`. Pending invites reserve open slots. `uniqueOn: ['teamId', 'slot', 'status']` rejects two pending claims for the same spot, while the action’s recipient check rejects duplicate pending invites and declined invites can be sent again.
- `team_messages`: team id, sender, plain text, and timestamp. Team membership is resolved server-side by the RecordRoom `team` permission.

DeepSpace `0.44.2` exposes confirmed CRUD and uniqueness constraints, but no public multi-record transaction primitive in `ActionTools`. OpenSpot therefore makes the important capacity invariant enforceable at individual writes: a pending invite owns a unique team slot before acceptance, and a membership write is unique per user. This prevents two different invitees from taking the same last reserved spot and prevents one participant from joining twice. The action creates the membership before changing the invite status; if the second write fails, the member is still safely on the team and the action reports the stale status explicitly. A future SDK transaction primitive would be the right upgrade for strict all-or-nothing status/membership writes.

## Scope and tradeoff

Matching is transparent rather than personalized: predefined skill and availability tags make the reason for a match visible and easy to explain in a live interview. AI matching, notifications, multiple events, and organizer dashboards are intentionally outside this version.

## Internship writeup draft

> I built OpenSpot, a real-time hackathon teammate finder for Hack the Lake. Participants create profiles with explicit skills and availability, discover complementary builders, create teams, send invites, and accept invitations into a live roster. I used DeepSpace Auth for identity, SQLite-backed RecordRoom collections for persistent state, server-enforced collection permissions, query-based realtime subscriptions, and server actions for validated cross-record workflows. The main product tradeoff was transparent tag-based matching instead of a personalized AI matcher, which kept the demo explainable and the data model small. The agent implemented the initial UI, schemas, server actions, tests, and documentation. **What I personally verified:** _replace this placeholder after testing the deployed app with two signed-in accounts._

## Personal verification checklist

- [ ] Sign in with two separate accounts.
- [ ] Save and reload both profiles; confirm the other profile is discoverable.
- [ ] Create a team and invite the second account.
- [ ] Accept from the recipient account and confirm the captain’s roster updates live.
- [ ] Try accepting as the wrong account, accepting twice, and taking the last spot concurrently.
- [ ] Run the deployed URL and confirm auth, filters, invite statuses, and error messages.
