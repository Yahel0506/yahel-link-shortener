import { createHash, randomBytes } from 'node:crypto'

export const SHORT_DOMAIN = 'link.yahel.dev'

export function createShortCode() {
  let code = ''
  while (code.length < 7) {
    code += randomBytes(6).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '')
  }
  return code.slice(0, 7)
}

export function createManagementToken() {
  return randomBytes(32).toString('base64url')
}

export function hashManagementToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function normalizeDestination(value) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 2048) {
    throw new Error('INVALID_URL')
  }

  const raw = value.trim()
  const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
    throw new Error('INVALID_URL')
  }

  return parsed.toString()
}

export function publicLink(link, managementToken) {
  return {
    id: link.shortCode,
    original: link.destinationUrl,
    short: `${SHORT_DOMAIN}/${link.shortCode}`,
    createdAt: link.createdAt,
    ...(managementToken ? { managementToken } : {}),
  }
}

export function methodNotAllowed(response, allowed) {
  response.setHeader('Allow', allowed)
  return response.status(405).json({ error: 'Método no permitido.' })
}

export function storageError(response, scope, error) {
  console.error('[link-storage]', scope, {
    code: error?.code,
    message: error?.message,
  })
  return response.status(503).json({
    error: 'No se pudo conectar con el almacenamiento de enlaces. Intenta de nuevo.',
    code: 'LINK_STORAGE_UNAVAILABLE',
  })
}
