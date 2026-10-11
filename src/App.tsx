import { useEffect, useMemo, useState } from 'react'
import type { AssetFile, AssetGroup, AssetIndex } from './types'
import { CDN_SOURCES, REL_PREFIX, fileUrl, type CdnId } from './cdn'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import AssetCard from './components/AssetCard'
import PreviewModal from './components/PreviewModal'
import SelectionBar from './components/SelectionBar'
import { IconSpinner } from './icons'

export interface Item {
  group: AssetGroup
  file: AssetFile
  rel: string
  i: number
}

const LS_CATEGORY = 'ss.active'
const LS_CDN = 'ss.cdn'

export default function App() {
  const [index, setIndex] = useState<AssetIndex | null>(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(
    () => localStorage.getItem(LS_CATEGORY) ?? 'all',
  )
  const [query, setQuery] = useState('')
  const [cdnId, setCdnId] = useState<CdnId>(
    () => (localStorage.getItem(LS_CDN) as CdnId) || CDN_SOURCES[0].id,
  )
  const [multi, setMulti] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [previewIdx, setPreviewIdx] = useState(-1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')

  const cdn = CDN_SOURCES.find((c) => c.id === cdnId) ?? CDN_SOURCES[0]

  useEffect(() => {
    let alive = true
    fetch('/data/assets.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: AssetIndex) => {
        if (alive) setIndex(d)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_CDN, cdnId)
  }, [cdnId])

  useEffect(() => {
    localStorage.setItem(LS_CATEGORY, active)
  }, [active])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1600)
    return () => clearTimeout(t)
  }, [toast])

  const flat = useMemo<Item[]>(() => {
    if (!index) return []
    const q = query.trim().toLowerCase()
    const groups =
      active === 'all'
        ? index.groups
        : index.groups.filter((g) => `${g.type}/${g.category}` === active)
    const items: Item[] = []
    let i = 0
    for (const g of groups) {
      for (const f of g.files) {
        if (q && !f.n.toLowerCase().includes(q) && !g.category.includes(q))
          continue
        items.push({
          group: g,
          file: f,
          rel: `${REL_PREFIX}${g.type}/${g.category}/${f.n}`,
          i: i++,
        })
      }
    }
    return items
  }, [index, active, query])

  const sections = useMemo(() => {
    const map = new Map<AssetGroup, Item[]>()
    for (const it of flat) {
      const arr = map.get(it.group)
      if (arr) arr.push(it)
      else map.set(it.group, [it])
    }
    return [...map.entries()]
  }, [flat])

  const total = useMemo(
    () =>
      index
        ? index.groups.reduce((n, g) => n + g.files.length, 0)
        : 0,
    [index],
  )

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast('已复制到剪贴板')
    } catch {
      setToast('复制失败，请手动复制')
    }
  }

  const toggleSelect = (rel: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rel)) next.delete(rel)
      else next.add(rel)
      return next
    })
  }

  const selectCategory = (key: string) => {
    setActive(key)
    setPreviewIdx(-1)
    setSidebarOpen(false)
  }

  if (error) {
    return (
      <div className="state">
        索引加载失败：{error}
        <button className="btn" onClick={() => location.reload()}>
          重试
        </button>
      </div>
    )
  }
  if (!index) {
    return (
      <div className="state">
        <IconSpinner size={22} /> 正在加载素材索引…
      </div>
    )
  }

  return (
    <div className={`app${sidebarOpen ? ' sidebar-open' : ''}`}>
      <Sidebar index={index} active={active} onSelect={selectCategory} />
      {sidebarOpen && (
        <div className="sidebar-mask" onClick={() => setSidebarOpen(false)} />
      )}
      <main className="main">
        <Toolbar
          index={index}
          query={query}
          onQuery={setQuery}
          cdnId={cdnId}
          onCdn={setCdnId}
          multi={multi}
          onToggleMulti={() => {
            setMulti((m) => !m)
            if (multi) setSelected(new Set())
            setPreviewIdx(-1)
          }}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          shown={flat.length}
          total={total}
        />
        <div className="content">
          {flat.length === 0 && <div className="state">无匹配素材</div>}
          {sections.map(([g, items]) => (
            <section key={`${g.type}/${g.category}`}>
              <h2>
                {g.category}
                <span>
                  {g.type === 'icon' ? '图标' : '图片'} · {items.length} 项
                </span>
              </h2>
              <div className="grid">
                {items.map((it) => (
                  <AssetCard
                    key={it.rel}
                    item={it}
                    cdnBase={cdn.base}
                    multi={multi}
                    selected={selected.has(it.rel)}
                    onClick={() => {
                      if (multi) toggleSelect(it.rel)
                      else setPreviewIdx(it.i)
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      {previewIdx >= 0 && flat[previewIdx] && (
        <PreviewModal
          item={flat[previewIdx]}
          cdnBase={cdn.base}
          hasPrev={previewIdx > 0}
          hasNext={previewIdx < flat.length - 1}
          onPrev={() => setPreviewIdx((i) => Math.max(0, i - 1))}
          onNext={() => setPreviewIdx((i) => Math.min(flat.length - 1, i + 1))}
          onClose={() => setPreviewIdx(-1)}
          onCopy={copy}
        />
      )}
      {multi && selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          onCopy={() =>
            copy(
              [...selected]
                .map((rel) => fileUrl(cdn.base, rel))
                .join('\n'),
            )
          }
          onClear={() => setSelected(new Set())}
          onClose={() => {
            setMulti(false)
            setSelected(new Set())
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
