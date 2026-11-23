import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clock3, MessageCircle, Users } from 'lucide-react'
import { Seo } from '../components/Seo'
import { Badge } from '../components/ui'
import { APP_NAME } from '../constants'
import { seo } from '../seo'

const sampleSkills = ['React', 'Product', 'AI']
const sampleMembers = [
  { initials: 'MC', name: 'Maya Chen', role: 'Product · AI', color: '#c9f0ee' },
  { initials: 'DR', name: 'Devon Reed', role: 'React · Python', color: '#ffd469' },
  { initials: 'NA', name: 'Noor Ali', role: 'Data · Research', color: '#ef668c' },
  { initials: 'LP', name: 'Leo Park', role: 'Design · Frontend', color: '#bfc8ff' },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="memphis-page min-h-screen overflow-hidden">
        <header className="memphis-header mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" className="memphis-logo">{APP_NAME}<span className="text-primary">!</span></Link>
          <Link to="/dashboard" className="text-sm font-bold text-muted-foreground transition hover:text-foreground">Already joined? Discover <ArrowRight className="ml-1 inline size-3.5" aria-hidden /></Link>
        </header>

        <main>
          <section className="memphis-hero mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 md:grid-cols-[0.9fr_1.1fr] md:pb-28 md:pt-20">
            <div>
              <Badge className="memphis-kicker" variant="warning" size="sm">Hack the Lake · Chicago · fictional demo</Badge>
              <h1 className="memphis-heading mt-6 max-w-2xl text-5xl leading-[0.96] tracking-tight md:text-7xl">Find your hackathon teammates.</h1>
              <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-muted-foreground">Join your hackathon, find people whose skills fit your team, and start planning as soon as you team up.</p>
              <div className="mt-8 flex flex-wrap items-center gap-4"><Link to="/dashboard" className="memphis-button inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm text-primary-foreground">Join the hackathon <ArrowRight className="size-4" aria-hidden /></Link><a href="#how-it-works" className="memphis-outline-button inline-flex h-12 items-center gap-2 rounded-lg px-5 text-sm">See how it works</a></div>
            </div>
            <div aria-label="OpenSpot product preview with four hackathon members" className="memphis-preview relative min-h-[470px] rounded-[2rem] p-5 md:p-8">
              <div className="absolute -right-5 -top-5 hidden rounded-full border-[3px] border-[#18253e] bg-[#ef668c] px-4 py-2 text-xs font-extrabold text-[#18253e] shadow-[4px_4px_0_#18253e] sm:block">A good fit, clearly explained</div>
              <div className="memphis-motion-stage">
                <div className="memphis-team-core"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-[#18253e]/70">Hack the Lake</p><p className="mt-1 text-xl font-black">Lake Effect</p></div><Badge variant="success">4 members</Badge></div><p className="mt-3 text-sm font-semibold text-[#18253e]/75">Climate & community</p><div className="mt-4 flex flex-wrap gap-2">{sampleSkills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div><p className="mt-4 text-xs font-bold text-[#16877f]">2 spots open · team chat ready</p></div>
                {sampleMembers.map((member, index) => <div key={member.initials} className={`memphis-member-card memphis-member-${index + 1}`} style={{ '--member-color': member.color } as React.CSSProperties}><span className="memphis-member-avatar">{member.initials}</span><span><strong>{member.name}</strong><small>{member.role}</small></span></div>)}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="memphis-step-section"><div className="mx-auto max-w-7xl px-6 py-20"><div className="max-w-2xl"><p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#18253e]">How it works</p><h2 className="memphis-heading mt-3 text-3xl tracking-tight md:text-4xl">Less guessing. More building.</h2></div><div className="mt-10 grid gap-6 md:grid-cols-3"><Step number="01" icon={<Users />} title="Join the event" copy="Sign in, add your skills and availability, and tell us whether you are recruiting or looking to join." /><Step number="02" icon={<Check />} title="Find a fit" copy="Browse one clear recommendation at a time. Every skill and availability reason is visible." /><Step number="03" icon={<MessageCircle />} title="Form and plan" copy="Send an invite, see the roster update live when it is accepted, and start a private team chat." /></div></div></section>
        </main>
        <footer className="mx-auto max-w-7xl px-6 py-8 text-sm font-bold text-muted-foreground">OpenSpot! · one event, better teams.</footer>
      </div>
    </>
  )
}

function Step({ number, icon, title, copy }: { number: string; icon: React.ReactNode; title: string; copy: string }) {
  return <div className="memphis-step-card rounded-2xl p-6"><div className="flex items-center justify-between text-primary"><span className="text-xs font-black tracking-wider">{number}</span><span className="[&_svg]:size-5">{icon}</span></div><h3 className="mt-8 text-lg font-black">{title}</h3><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{copy}</p></div>
}
