import { and, eq, isNull } from 'drizzle-orm'
import { shortLinks } from '../db/schema.js'
import { db } from '../server/db.js'
import {
  createManagementToken,
  createShortCode,
  hashManagementToken,
  methodNotAllowed,
  normalizeDestination,
  publicLink,
  storageError,
} from '../server/links.js'

export default async function handler(request, response) {
  if (request.method === 'DELETE') {
    const id = Array.isArray(request.query?.id) ? request.query.id[0] : request.query?.id
    const managementToken = request.body?.managementToken
    if (typeof id !== 'string' || typeof managementToken !== 'string') {
      return response.status(400).json({ error: 'Solicitud incompleta.' })
    }

    let deleted
    try {
      ;[deleted] = await db
        .update(shortLinks)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(shortLinks.shortCode, id),
            eq(shortLinks.managementTokenHash, hashManagementToken(managementToken)),
            isNull(shortLinks.deletedAt),
          ),
        )
        .returning({ id: shortLinks.shortCode })
    } catch (error) {
      return storageError(response, 'delete', error)
    }

    if (!deleted) return response.status(404).json({ error: 'El enlace no existe o ya fue eliminado.' })

    response.setHeader('Cache-Control', 'no-store')
    return response.status(200).json({ deleted: true, id: deleted.id })
  }

  if (request.method !== 'POST') return methodNotAllowed(response, 'POST, DELETE')

  let destinationUrl
  try {
    destinationUrl = normalizeDestination(request.body?.url)
  } catch {
    return response.status(400).json({ error: 'Pega un enlace válido con dominio completo.' })
  }

  const managementToken = createManagementToken()
  const managementTokenHash = hashManagementToken(managementToken)

  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const shortCode = createShortCode()
      try {
        const [created] = await db
          .insert(shortLinks)
          .values({ shortCode, destinationUrl, managementTokenHash })
          .returning()

        response.setHeader('Cache-Control', 'no-store')
        return response.status(201).json({ link: publicLink(created, managementToken) })
      } catch (error) {
        const isCollision = error?.code === '23505'
        if (!isCollision || attempt === 3) throw error
      }
    }
  } catch (error) {
    return storageError(response, 'create', error)
  }

  return response.status(500).json({ error: 'No se pudo crear el enlace.' })
}
