import { and, eq, isNull } from 'drizzle-orm'
import { shortLinks } from '../db/schema.js'
import { db } from '../server/db.js'

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD')
    return response.status(405).end()
  }

  const code = Array.isArray(request.query?.code) ? request.query.code[0] : request.query?.code
  if (typeof code !== 'string') return response.status(404).send('Enlace no encontrado.')

  const [link] = await db
    .select({ destinationUrl: shortLinks.destinationUrl })
    .from(shortLinks)
    .where(and(eq(shortLinks.shortCode, code), isNull(shortLinks.deletedAt)))
    .limit(1)

  if (!link) return response.status(404).send('Este enlace no existe o ya no está activo.')

  response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
  return response.redirect(302, link.destinationUrl)
}
