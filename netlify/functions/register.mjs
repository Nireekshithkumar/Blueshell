import { forwardEnquiry } from '../lib/forward-enquiry.mjs'

export default function register(request) {
  return forwardEnquiry(request, process.env.REGISTRATION_SCRIPT_URL, process.env.REGISTRATION_SHARED_SECRET)
}
