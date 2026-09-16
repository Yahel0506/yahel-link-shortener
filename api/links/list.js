import { and, eq, isNull, or } from 'drizzle-orm'
import { shortLinks } from '../../db/schema.js'
import { db } from '../../server/db.js'
import { hashManagementToken, methodNotAllowed, publicLink } from '../../server/links.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST')

  const ownedLinks = Array.isArray(request.body?.links) ? request.body.links.slice(0, 100) : []
  const validLinks = ownedLinks.filter(
    (link) => typeof link?.id === 'string' && typeof link?.managementToken === 'string',
  )

  if (validLinks.length === 0) {
    return response.status(200).json({ links: [] })
  }

  const conditions = validLinks.map((link) =>
    and(
      eq(shortLinks.shortCode, link.id),
      eq(shortLinks.managementTokenHash, hashManagementToken(link.managementToken)),
    ),
  )

  const rows = await db
    .select()
    .from(shortLinks)
    .where(and(isNull(shortLinks.deletedAt), or(...conditions)))
    .orderBy(shortLinks.createdAt)

  const tokenById = new Map(validLinks.map((link) => [link.id, link.managementToken]))
  response.setHeader('Cache-Control', 'no-store')
  return response.status(200).json({
    links: rows.reverse().map((link) => publicLink(link, tokenById.get(link.shortCode))),
  })
}
