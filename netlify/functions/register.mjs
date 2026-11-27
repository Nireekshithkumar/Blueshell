export default async function register(request) {
  const json = (body, status) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}})
  if (request.method !== 'POST') return json({ok: false}, 405)
  const endpoint = process.env.REGISTRATION_SCRIPT_URL
  const token = process.env.REGISTRATION_SHARED_SECRET
  if (!token || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint ?? '')) {
    return json({ok: false, error: 'configuration'}, 503)
  }
  let fields
  try {
    fields = await request.json()
    if (!fields || typeof fields.id !== 'string') return json({ok:false}, 400)
  } catch { return json({ok: false}, 400) }
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...fields, token}), signal: AbortSignal.timeout(27000),
    })
    if (!upstream.ok) return json({ok: false}, 502)
    const receipt = await upstream.json()
    if (receipt.ok === true && receipt.id === fields.id) return json({ok: true, id: fields.id}, 200)
    return json({ok: false}, receipt.error === 'invalid' ? 400 : receipt.error === 'conflict' ? 409 : 502)
  } catch { return json({ok: false}, 502) }
}
