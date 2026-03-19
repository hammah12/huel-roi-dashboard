import { updateSignal } from '../_lib/airtable.js'
import { allowMethods, requireWriteAccess, sendError, sendJson } from '../_lib/http.js'
import { validateSignalPayload } from '../_lib/validation.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['PUT'])) {
    return
  }

  if (!requireWriteAccess(request, response)) {
    return
  }

  const { id } = request.query

  try {
    const signal = await updateSignal(id, validateSignalPayload(request.body || {}))
    sendJson(response, 200, { signal })
  } catch (error) {
    sendError(response, error, 'Unable to update Airtable signal.')
  }
}
