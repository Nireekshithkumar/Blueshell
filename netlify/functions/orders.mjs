import { forwardEnquiry } from '../lib/forward-enquiry.mjs'

export default function orders(request) {
  return forwardEnquiry(request, process.env.ORDERS_SCRIPT_URL, process.env.ORDERS_SHARED_SECRET)
}
