import { fetchStatus } from './_lib/airtable.js'
import { allowMethods, sendError, sendJson } from './_lib/http.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['GET'])) {
    return
  }

  try {
    const status = await fetchStatus()
    sendJson(response, 200, status)
  } catch (error) {
    sendError(response, error, 'Unable to inspect Airtable connection status.')
  }
}
