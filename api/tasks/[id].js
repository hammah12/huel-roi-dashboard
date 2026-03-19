import { updateTask } from '../_lib/airtable.js'
import { allowMethods, requireWriteAccess, sendError, sendJson } from '../_lib/http.js'
import { validateTaskPayload } from '../_lib/validation.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['PUT'])) {
    return
  }

  if (!requireWriteAccess(request, response)) {
    return
  }

  const { id } = request.query

  try {
    const task = await updateTask(id, validateTaskPayload(request.body || {}))
    sendJson(response, 200, { task })
  } catch (error) {
    sendError(response, error, 'Unable to update Airtable task.')
  }
}
