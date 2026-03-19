import { createClient } from '../_lib/airtable.js'
import { allowMethods, requireWriteAccess, sendError, sendJson } from '../_lib/http.js'
import { validateClientPayload } from '../_lib/validation.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) {
    return
  }

  if (!requireWriteAccess(request, response)) {
    return
  }

  try {
    const client = await createClient(validateClientPayload(request.body || {}))
    sendJson(response, 201, { client })
  } catch (error) {
    sendError(response, error, 'Unable to create Airtable client record.')
  }
}
