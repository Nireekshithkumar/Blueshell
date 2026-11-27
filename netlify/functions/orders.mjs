import { forwardEnquiry } from '../lib/forward-enquiry.mjs'

export default async function orders(request) {
  const endpoint = process.env.ORDERS_SCRIPT_URL?.trim()
  const token = process.env.ORDERS_SHARED_SECRET
  const response = await forwardEnquiry(request, endpoint, token?.trim() ? token : undefined)
  if (response.status === 503) {
    // Log setting names only. Never log the endpoint, token, or request body.
    if (!token?.trim()) console.error('Orders configuration: ORDERS_SHARED_SECRET is missing')
    if (!endpoint) console.error('Orders configuration: ORDERS_SCRIPT_URL is missing')
    else if (token?.trim()) console.error('Orders configuration: ORDERS_SCRIPT_URL is not a supported /exec URL')
  }
  return response
}
