import { sql } from 'drizzle-orm'
import { db } from '../server/db.js'
import { storageError } from '../server/links.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Método no permitido.' })
  }

  try {
    const result = await db.execute(sql`select to_regclass('public.short_links') as table_name`)
    const tableReady = result.rows?.[0]?.table_name === 'short_links'
    response.setHeader('Cache-Control', 'no-store')
    return response.status(tableReady ? 200 : 503).json({
      ok: tableReady,
      database: 'connected',
      schema: tableReady ? 'ready' : 'missing_short_links',
    })
  } catch (error) {
    return storageError(response, 'health', error)
  }
}
