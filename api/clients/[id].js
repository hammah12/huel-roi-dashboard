import { deleteClient, updateClient } from '../_lib/airtable.js'
import { allowMethods, requireWriteAccess, sendError, sendJson } from '../_lib/http.js'
import { validateClientPayload } from '../_lib/validation.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['PUT', 'DELETE'])) {
    return
  }

  if (!requireWriteAccess(request, response)) {
    return
  }

  const { id } = request.query

  try {
    if (request.method === 'PUT') {
      const client = await updateClient(id, validateClientPayload(request.body || {}))
      sendJson(response, 200, { client })
      return
    }

    await deleteClient(id)
    sendJson(response, 200, { success: true })
  } catch (error) {
    sendError(response, error, 'Unable to mutate Airtable client record.')
  }
}
