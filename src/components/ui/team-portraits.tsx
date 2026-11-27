import { useState } from 'react'
import { ArrowUpRight, Plus } from 'lucide-react'
import { team } from '@/data/content'

const college = 'Yenepoya Institute of Technology'

export function TeamPortraits() {
  const [active, setActive] = useState<string | null>(null)
  return <div className="member-gallery" onKeyDown={event => {
    if (event.key === 'Escape') {
      const card = (event.target as HTMLElement).closest('article')
      card?.querySelector('button')?.focus()
      setActive(null)
    }
  }}>
    {[team.slice(0, 3), team.slice(3)].map((row, rowIndex) =>
      <div className="member-row" key={rowIndex}
        onPointerLeave={event => {
          if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) setActive(null)
        }}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActive(null) }}>
        {row.map((person, i) => {
          const open = active === person.name
          const id = 'member-details-' + (rowIndex * 3 + i)
          return <article key={person.name} className="member-card" data-open={open}
            onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(person.name) }}>
            <button type="button" className="member-photo" aria-expanded={open} aria-controls={id}
              aria-label={'Details for ' + person.name}
              onClick={event => setActive(event.detail && matchMedia('(hover:hover)').matches ? person.name : open ? null : person.name)}>
              <img src={person.image} alt="" loading="lazy" />
              <span className="member-caption">{person.name}<Plus size={18} aria-hidden="true" /></span>
            </button>
            <div className="member-details" id={id} inert={!open}>
              <div>
                <h3>{person.name}</h3>
                <p>{college}</p>
                {person.certificate && <a href={person.certificate} target="_blank" rel="noreferrer">
                  View certificate <ArrowUpRight size={14} />
                </a>}
              </div>
            </div>
          </article>
        })}
      </div>)}
  </div>
}
