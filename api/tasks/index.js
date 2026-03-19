import { createTask } from '../_lib/airtable.js'
import { allowMethods, requireWriteAccess, sendError, sendJson } from '../_lib/http.js'
import { validateTaskPayload } from '../_lib/validation.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) {
    return
  }

  if (!requireWriteAccess(request, response)) {
    return
  }

  try {
    const task = await createTask(validateTaskPayload(request.body || {}))
    sendJson(response, 201, { task })
  } catch (error) {
    sendError(response, error, 'Unable to create Airtable task.')
  }
}
