import { createSignal } from '../_lib/airtable.js'
import { allowMethods, requireWriteAccess, sendError, sendJson } from '../_lib/http.js'
import { validateSignalPayload } from '../_lib/validation.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) {
    return
  }

  if (!requireWriteAccess(request, response)) {
    return
  }

  try {
    const signal = await createSignal(validateSignalPayload(request.body || {}))
    sendJson(response, 201, { signal })
  } catch (error) {
    sendError(response, error, 'Unable to create Airtable signal.')
  }
}
