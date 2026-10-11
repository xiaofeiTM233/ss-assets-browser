import { useEffect, useMemo, useState } from 'react'
import type { AssetFile, AssetGroup, AssetIndex } from './types'
import { CDN_SOURCES, REL_PREFIX, fileUrl, type CdnId } from './cdn'
import AssetCard from './components/AssetCard'
import PreviewModal from './components/PreviewModal'
import {
  CheckSquareOutlined,
  CloseOutlined,
  CopyOutlined,
  MenuOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  App as AntApp,
  Button,
  Empty,
  Input,
  Layout,
  Menu,
  Select,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

export interface Item {
  group: AssetGroup
  file: AssetFile
  rel: string
  i: number
}

const LS_CATEGORY = 'ss.active'
const LS_CDN = 'ss.cdn'

export default function App() {
  const { message } = AntApp.useApp()
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
  const [broken, setBroken] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

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

  const total = useMemo(
    () => (index ? index.groups.reduce((n, g) => n + g.files.length, 0) : 0),
    [index],
  )

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

  const menuItems = useMemo(() => {
    if (!index) return []
    const withCount = (key: string, label: string, count: number) => ({
      key,
      label: (
        <span className="menu-label">
          {label}
          <span className="count">{count}</span>
        </span>
      ),
    })
    const group = (type: string, title: string) => ({
      type: 'group' as const,
      label: title,
      children: index.groups
        .filter((g) => g.type === type)
        .map((g) => withCount(`${type}/${g.category}`, g.category, g.files.length)),
    })
    return [
      withCount('all', '全部素材', total),
      group('icon', '图标'),
      group('image', '图片'),
    ]
  }, [index, total])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败，请手动复制')
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
    if (broken) setCollapsed(true)
  }

  if (error) {
    return (
      <div className="state">
        <Typography.Text type="danger">索引加载失败：{error}</Typography.Text>
        <Button onClick={() => location.reload()}>重试</Button>
      </div>
    )
  }
  if (!index) {
    return (
      <div className="state">
        <Typography.Text type="secondary">正在加载素材索引…</Typography.Text>
      </div>
    )
  }

  const { version, sha, date, message: commitMsg } = index.commit
  const dateText = date ? new Date(date).toLocaleDateString('zh-CN') : ''

  return (
    <Layout hasSider style={{ height: '100vh' }}>
      <Layout.Sider
        width={232}
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={collapsed}
        onBreakpoint={setBroken}
        onCollapse={setCollapsed}
        trigger={null}
        theme="dark"
        style={{ overflow: 'auto', borderRight: '1px solid #27303c' }}
      >
        <Menu
          mode="inline"
          items={menuItems}
          selectedKeys={[active]}
          onClick={(e) => selectCategory(e.key)}
          style={{ border: 'none', paddingTop: 8 }}
        />
      </Layout.Sider>
      <Layout style={{ minWidth: 0 }}>
        <div className="toolbar">
          {broken && (
            <Button
              icon={<MenuOutlined />}
              onClick={() => setCollapsed((c) => !c)}
            />
          )}
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />}
            placeholder="搜索文件名…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: '1 1 200px', maxWidth: 440 }}
          />
          <Select
            value={cdnId}
            onChange={setCdnId}
            style={{ width: 170 }}
            options={CDN_SOURCES.map((c) => ({ value: c.id, label: c.label }))}
          />
          <Tooltip title="批量选择">
            <Button
              type={multi ? 'primary' : 'default'}
              icon={<CheckSquareOutlined />}
              onClick={() => {
                setMulti((m) => !m)
                if (multi) setSelected(new Set())
                setPreviewIdx(-1)
              }}
            />
          </Tooltip>
          <Typography.Text type="secondary" className="result-count">
            {flat.length === total ? total : `${flat.length} / ${total}`} 项
          </Typography.Text>
          <Tooltip
            title={
              <div>
                提交：{commitMsg}
                <br />
                时间：{date}
                <br />
                索引生成于 {new Date(index.generatedAt).toLocaleString('zh-CN')}
              </div>
            }
          >
            <Tag className="version-badge" color="blue">
              v{version || '未知'} · {sha.slice(0, 7)} · {dateText}
            </Tag>
          </Tooltip>
        </div>
        <Layout.Content className="content">
          {flat.length === 0 && (
            <Empty description="无匹配素材" style={{ marginTop: 80 }} />
          )}
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
        </Layout.Content>
      </Layout>
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
        <div className="selection-bar">
          <Typography.Text>已选 {selected.size} 项</Typography.Text>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() =>
              copy(
                [...selected].map((rel) => fileUrl(cdn.base, rel)).join('\n'),
              )
            }
          >
            复制链接
          </Button>
          <Button onClick={() => setSelected(new Set())}>清空</Button>
          <Button
            icon={<CloseOutlined />}
            onClick={() => {
              setMulti(false)
              setSelected(new Set())
            }}
          />
        </div>
      )}
    </Layout>
  )
}
