import type { AssetIndex } from '../types'
import { CDN_SOURCES, type CdnId } from '../cdn'
import { IconCheckSquare, IconMenu, IconSearch } from '../icons'

interface ToolbarProps {
  index: AssetIndex
  query: string
  onQuery: (v: string) => void
  cdnId: CdnId
  onCdn: (id: CdnId) => void
  multi: boolean
  onToggleMulti: () => void
  onToggleSidebar: () => void
  shown: number
  total: number
}

export default function Toolbar({
  index,
  query,
  onQuery,
  cdnId,
  onCdn,
  multi,
  onToggleMulti,
  onToggleSidebar,
  shown,
  total,
}: ToolbarProps) {
  const { version, sha, date, message } = index.commit
  const dateText = date ? new Date(date).toLocaleDateString('zh-CN') : ''

  return (
    <div className="toolbar">
      <button
        className="icon-btn menu-btn"
        title="分类目录"
        onClick={onToggleSidebar}
      >
        <IconMenu size={18} />
      </button>
      <div className="search">
        <IconSearch />
        <input
          type="search"
          placeholder="搜索文件名…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>
      <select
        className="cdn-select"
        title="图片 CDN 源"
        value={cdnId}
        onChange={(e) => onCdn(e.target.value as CdnId)}
      >
        {CDN_SOURCES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        className={`icon-btn${multi ? ' on' : ''}`}
        title="批量选择"
        onClick={onToggleMulti}
      >
        <IconCheckSquare size={18} />
      </button>
      <span className="result-count">
        {shown === total ? total : `${shown} / ${total}`} 项
      </span>
      <span
        className="version-badge"
        title={`提交：${message}\n时间：${date}\n索引生成于 ${new Date(index.generatedAt).toLocaleString('zh-CN')}`}
      >
        v{version || '未知'} · {sha.slice(0, 7)} · {dateText}
      </span>
    </div>
  )
}
