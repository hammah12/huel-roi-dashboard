import { fetchBootstrapData } from './_lib/airtable.js'
import { allowMethods, sendError, sendJson } from './_lib/http.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['GET'])) {
    return
  }

  try {
    const data = await fetchBootstrapData()
    sendJson(response, 200, data)
  } catch (error) {
    sendError(response, error, 'Unable to load dashboard data from Airtable.')
  }
}
