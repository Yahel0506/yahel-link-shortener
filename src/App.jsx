import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, Check, Copy, ExternalLink, Link2, LoaderCircle, Trash2 } from 'lucide-react'

const STORAGE_KEY = 'yaheldev-managed-short-links-v2'

async function readApiResponse(response) {
  const raw = await response.text()
  let payload
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    payload = { error: raw || 'El servidor devolvió una respuesta inesperada.' }
  }

  if (!response.ok) throw new Error(payload.error || 'No se pudo completar la solicitud.')
  return payload
}

function readOwnedLinks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function normalizeUrl(value) {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function CopyButton({ value, label = 'Copiar enlace' }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${value}`)
      setCopied(true)
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      const area = document.createElement('textarea')
      area.value = `https://${value}`
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
      setCopied(true)
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <button
      className={`copy-button${copied ? ' is-copied' : ''}`}
      type="button"
      onClick={copy}
      aria-label={copied ? 'Enlace copiado' : label}
      title={copied ? 'Copiado' : label}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </button>
  )
}

function DeleteButton({ link, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true)
      timeoutRef.current = window.setTimeout(() => setConfirming(false), 3500)
      return
    }

    setDeleting(true)
    window.clearTimeout(timeoutRef.current)
    try {
      await onDelete(link)
    } catch {
      // The parent surfaces the request error in the form status.
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <button
      className={`delete-button${confirming ? ' is-confirming' : ''}`}
      type="button"
      onClick={handleClick}
      disabled={deleting}
      aria-label={confirming ? `Confirmar eliminación de ${link.short}` : `Eliminar ${link.short}`}
      title={confirming ? 'Confirmar eliminación' : 'Eliminar enlace'}
    >
      {deleting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
      {confirming && <span>Eliminar</span>}
    </button>
  )
}

export default function App() {
  const [ownedLinks] = useState(readOwnedLinks)
  const [url, setUrl] = useState('')
  const [currentLink, setCurrentLink] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(ownedLinks.length > 0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ownedLinks.length === 0) {
      return undefined
    }

    const controller = new AbortController()
    fetch('/api/links/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: ownedLinks }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await readApiResponse(response)
        setHistory(payload.links)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.links))
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError('No pude cargar tus enlaces. Revisa la conexión e intenta de nuevo.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingHistory(false)
      })

    return () => controller.abort()
  }, [ownedLinks])

  const isValid = useMemo(() => {
    if (!url.trim()) return false
    try {
      const parsed = new URL(normalizeUrl(url))
      return Boolean(parsed.hostname.includes('.'))
    } catch {
      return false
    }
  }, [url])

  const shorten = async (event) => {
    event.preventDefault()
    if (!isValid) {
      setError('Pega un enlace válido, por ejemplo: yahel.dev/proyecto')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizeUrl(url) }),
      })
      const payload = await readApiResponse(response)

      setCurrentLink(payload.link)
      setHistory((previous) => {
        const next = [payload.link, ...previous]
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    } catch (requestError) {
      setError(requestError.message || 'No se pudo acortar el enlace. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setUrl('')
    setCurrentLink(null)
    setError('')
  }

  const deleteLink = async (link) => {
    const response = await fetch(`/api/links?id=${encodeURIComponent(link.id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managementToken: link.managementToken }),
    })
    await readApiResponse(response)

    setHistory((previous) => {
      const next = previous.filter((item) => item.id !== link.id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    if (currentLink?.id === link.id) reset()
  }

  return (
    <div className="app-shell">
      <div className="grid" aria-hidden="true" />
      <div className="aurora" aria-hidden="true">
        <span className="aurora-copper" />
        <span className="aurora-plum" />
      </div>
      <div className="noise" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="https://yahel.dev" aria-label="Ir a yahel.dev">
          <span className="brand-mark" aria-hidden="true">
            <img src="/yaheldev.svg" alt="" />
          </span>
          <span>yahel.dev</span>
        </a>
        <a className="home-link" href="https://yahel.dev">
          Volver al sitio
          <ExternalLink aria-hidden="true" />
        </a>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Pega tu enlace.</h1>
          </div>

          <form className="shortener" onSubmit={shorten} noValidate>
            <div className={`field-shell${error ? ' has-error' : ''}${currentLink ? ' is-result' : ''}`}>
              <span className="field-icon" aria-hidden="true"><Link2 /></span>
              {currentLink ? (
                <div className="result-value" aria-live="polite">
                  <span>{currentLink.short}</span>
                  <CopyButton value={currentLink.short} />
                </div>
              ) : (
                <>
                  <label className="sr-only" htmlFor="long-url">Enlace que quieres acortar</label>
                  <input
                    id="long-url"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Pega un enlace largo aquí"
                    aria-describedby={error ? 'url-error' : 'url-help'}
                    aria-invalid={Boolean(error)}
                    autoFocus
                  />
                </>
              )}
            </div>
            <p id={error ? 'url-error' : 'url-help'} className={`field-note${error ? ' error' : ''}`}>
              {error || 'Acepta enlaces con o sin https://'}
            </p>
            {currentLink ? (
              <button className="primary-button" type="button" onClick={reset}>
                Acortar nuevo enlace
              </button>
            ) : (
              <button className="primary-button" type="submit" disabled={!url.trim() || submitting}>
                {submitting ? (
                  <><LoaderCircle className="spin" aria-hidden="true" /> Acortando…</>
                ) : (
                  <>Acortar enlace <ArrowDown aria-hidden="true" /></>
                )}
              </button>
            )}
          </form>
        </section>

        <section className="history-section" aria-labelledby="history-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Tus enlaces</p>
              <h2 id="history-title">Historial activo</h2>
            </div>
            <p>{history.length} {history.length === 1 ? 'enlace activo' : 'enlaces activos'} administrados desde este dispositivo.</p>
          </div>

          {loadingHistory ? (
            <div className="empty-state" aria-live="polite">
              <LoaderCircle className="spin" aria-hidden="true" />
              <p>Cargando enlaces…</p>
            </div>
          ) : history.length > 0 ? (
            <div className="history-list">
              {history.map((link, index) => (
                <article className="history-row" key={link.id} style={{ '--row-index': index }}>
                  <span className="status-dot" aria-label="Activo" title="Activo" />
                  <div className="link-details">
                    <a className="short-link" href={`https://${link.short}`} target="_blank" rel="noreferrer">
                      {link.short}
                      <ExternalLink aria-hidden="true" />
                    </a>
                    <p title={link.original}>{link.original}</p>
                  </div>
                  <div className="row-actions">
                    <CopyButton value={link.short} label={`Copiar ${link.short}`} />
                    <DeleteButton link={link} onDelete={deleteLink} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Link2 aria-hidden="true" />
              <h3>Aún no hay enlaces</h3>
              <p>El primero que acortes aparecerá aquí.</p>
            </div>
          )}
        </section>
      </main>

      <footer>
        <span>Hecho por yahel.dev</span>
        <span>Solo este dispositivo puede administrar los enlaces que crea.</span>
      </footer>
    </div>
  )
}
