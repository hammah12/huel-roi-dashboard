export function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload)
}

export function sendError(response, error, fallbackMessage = 'Unexpected server error') {
  const statusCode = error?.status && Number.isInteger(error.status) ? error.status : 500
  sendJson(response, statusCode, {
    error: error?.message || fallbackMessage,
  })
}

export function allowMethods(request, response, methods) {
  if (methods.includes(request.method)) {
    return true
  }

  response.setHeader('Allow', methods.join(', '))
  sendJson(response, 405, { error: `Method ${request.method} not allowed.` })
  return false
}

export function requireWriteAccess(request, response) {
  const configuredToken = process.env.APP_WRITE_TOKEN

  if (!configuredToken) {
    return true
  }

  const providedToken = request.headers['x-app-write-token']

  if (providedToken === configuredToken) {
    return true
  }

  sendJson(response, 401, {
    error: 'Write access requires a valid app token.',
    code: 'WRITE_AUTH_REQUIRED',
  })
  return false
}
