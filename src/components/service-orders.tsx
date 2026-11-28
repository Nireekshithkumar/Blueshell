import { emailDraft, openEmailDraft } from '../lib/email-draft'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { X } from 'lucide-react'
import SpecularButton from './ui/specular-button/SpecularButton'
import { useMotionSettings } from './ui/motion-settings'
import { Button } from './ui/button'
import './service-orders.css'

const service = 'Whole system setup'
const headline = 'Plan your tank setup.'

export function ServiceOrders() {
  const [open, setOpen] = useState(false)
  const { enabled } = useMotionSettings()
  const panel = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (!enabled || entered) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setEntered(true); observer.disconnect() }
    }, { threshold: .15 })
    observer.observe(panel.current!)
    return () => observer.disconnect()
  }, [enabled, entered])

  return <div className="service-orders" id="system-setup" ref={panel} data-playing={enabled && entered}>
    <div className="setup-photo">
      <img src="assets/system-setup.webp" alt="Freshwater mussels in the BlueShells setup tank" width="960" height="1280" loading="lazy" />
    </div>
    <div className="setup-copy">
      <h2 className="setup-title" aria-label={headline}>
        {headline.split(' ').map((word, index) => <span className="setup-word" aria-hidden="true" key={word}>
          {Array.from(word, (letter, i) => <span className="setup-letter" key={i}
            style={{ '--delay': (index * 140 + i * 32) + 'ms' } as CSSProperties}>{letter}</span>)}
        </span>)}
      </h2>
      <p>Starting a new tank or upgrading an existing one? Tell us what you have and where you need help.</p>
      <SpecularButton className="order-trigger" size="lg" followMouse={enabled} aria-haspopup="dialog" onClick={() => setOpen(true)}>ORDER NOW</SpecularButton>
    </div>
    {open && <OrderForm close={() => setOpen(false)} />}
  </div>
}

function OrderForm({close}: {close: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = useRef(false)
  const receipt = useRef({key:'', id:''})
  const [draft, setDraft] = useState('')
  const [state, setState] = useState<'ready' | 'saving' | 'saved' | 'failed' | 'unconfigured'>('ready')
  useEffect(() => {
    const el = dialog.current!
    el.showModal()
    return () => el.close()
  }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const inputs = new FormData(event.currentTarget)
    const text = (name: string) => String(inputs.get(name) ?? '').trim()
    const fields = {service, name:text('name'), phone:text('phone'), email:text('email'), requirements:text('requirements')}
    busy.current = true
    setState('saving')
    try {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(fields)))
      const key = 'blueshells-order-' + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('')
      if (key !== receipt.current.key) {
        let id: string = crypto.randomUUID()
        try { id = sessionStorage.getItem(key) || id; sessionStorage.setItem(key,id) } catch { /* Use the in-memory receipt. */ }
        receipt.current = {key,id}
      }
      const {id} = receipt.current
      const response = await fetch('/.netlify/functions/orders', {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'omit',
        body:JSON.stringify({...fields,id}), signal:AbortSignal.timeout(35000),
      })
      const result = await response.json()
      if (response.status === 503 && result?.error === 'configuration') {
        busy.current = false
        setState('unconfigured')
        return
      }
      if (!response.ok) throw new Error('Save failed')
      if (result.ok !== true || result.id !== id) throw new Error('Missing receipt')
      const link = emailDraft(`BlueShells Order Enquiry – ${result.id}`, [
        `Service: ${fields.service}`,
        `Name: ${fields.name}`,
        `Phone: ${fields.phone}`,
        `Email: ${fields.email}`,
        `Requirements: ${fields.requirements}`,
      ])
      setDraft(link)
      setState('saved')
      openEmailDraft(link)
    } catch {
      busy.current = false
      setState('failed')
    }
  }
  return <dialog ref={dialog} className="modal-card order-dialog" aria-labelledby="order-heading"
    onCancel={e => { if (state === 'saving') e.preventDefault(); else close() }}>
    <button type="button" aria-label="Close" className="close" disabled={state === 'saving'} onClick={close}><X/></button>
    <h2 id="order-heading">Service order enquiry</h2>
    {state === 'saved' ? <><p role="status"><strong>Enquiry received</strong><br/>Enquiry ID: <code>{receipt.current.id}</code></p><a href={draft}>Open email draft</a></> :
    <form onSubmit={submit}><fieldset disabled={state === 'saving'}>
      <label>Service<input name="service" value={service} readOnly/></label>
      <label>Name<input name="name" required autoComplete="name" maxLength={200} autoFocus/></label>
      <label>Phone number<input name="phone" type="tel" required autoComplete="tel" maxLength={60}/></label>
      <label>Email<input name="email" type="email" required autoComplete="email" maxLength={320}/></label>
      <label>Tell us about your setup or requirements<textarea name="requirements" rows={3} maxLength={4000}/></label>
      <Button type="submit">{state === 'saving' ? 'Saving…' : 'Submit enquiry'}</Button>
    </fieldset>{state === 'unconfigured' && <p role="alert">Ordering is temporarily unavailable. Your enquiry has not been sent. Your details are here so you can try again later.</p>}{state === 'failed' && <p role="alert">We couldn’t confirm the save. Your details are here. Please try again.</p>}</form>}
  </dialog>
}
