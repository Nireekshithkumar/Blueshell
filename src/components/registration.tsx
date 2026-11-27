import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { Button } from './ui/button'

export function Registration({days, fee, onClose}: {days: number; fee: number; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const locked = useRef(false)
  const receipt = useRef({ fingerprint: '', id: '' })
  const [state, setState] = useState<'ready' | 'saving' | 'saved' | 'failed'>('ready')
  useEffect(() => {
    const el = dialog.current!
    el.showModal()
    return () => el.close()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked.current) return
    const form = new FormData(event.currentTarget)
    const fields = {days, name: String(form.get('name')).trim(), phone: String(form.get('phone')).trim(), email: String(form.get('email')).trim()}
    locked.current = true
    setState('saving')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 35000)
    try {
      const endpoint = import.meta.env.VITE_REGISTRATION_ENDPOINT
      if (!endpoint) throw new Error('Missing deployment URL')
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(fields)))
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
      const storageKey = 'blueshells-registration-' + fingerprint
      if (receipt.current.fingerprint !== fingerprint) {
        let id = crypto.randomUUID() as string
        try { id = sessionStorage.getItem(storageKey) || id; sessionStorage.setItem(storageKey, id) } catch { /* In-memory retries still work. */ }
        receipt.current = {fingerprint, id}
      }
      const { id } = receipt.current
      const response = await fetch(endpoint, {
        method: 'POST', headers: {'Content-Type': 'text/plain;charset=UTF-8'},
        body: JSON.stringify({...fields, id}), signal: controller.signal, credentials: 'omit',
      })
      if (!response.ok) throw new Error('Save failed')
      const result = await response.json()
      if (result.ok !== true || result.id !== id) throw new Error('Missing receipt')
      setState('saved')
    } catch {
      locked.current = false
      setState('failed')
    } finally { clearTimeout(timeout) }
  }

  return <dialog ref={dialog} className="modal-card" aria-labelledby="register-title"
    onCancel={e => { if (state === 'saving') e.preventDefault(); else onClose() }}
    onClick={e => {
      if (e.target !== dialog.current || state === 'saving') return
      const r = dialog.current!.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose()
    }}>
    <button className="close" onClick={onClose} disabled={state === 'saving'} aria-label="Close"><X/></button>
    <h2 id="register-title">Register your interest.</h2>
    <p>{days} days · ₹{fee.toLocaleString('en-IN')}</p>
    <form onSubmit={submit}>
      <fieldset disabled={state === 'saving' || state === 'saved'}>
        <label>Name<input name="name" required autoFocus/></label>
        <label>Phone<input name="phone" type="tel" required/></label>
        <label>Gmail / email<input name="email" type="email" required/></label>
        <Button type="submit">{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Submit'} <ArrowUpRight size={16}/></Button>
      </fieldset>
    </form>
    {state === 'saved' && <p role="status">Your training registration has been saved.</p>}
    {state === 'failed' && <p role="alert">We couldn’t confirm your registration. Your entries are here. Please try Submit again.</p>}
  </dialog>
}
