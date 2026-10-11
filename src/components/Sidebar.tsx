import type { AssetIndex } from '../types'

interface SidebarProps {
  index: AssetIndex
  active: string
  onSelect: (key: string) => void
}

export default function Sidebar({ index, active, onSelect }: SidebarProps) {
  const total = index.groups.reduce((n, g) => n + g.files.length, 0)
  const iconGroups = index.groups.filter((g) => g.type === 'icon')
  const imageGroups = index.groups.filter((g) => g.type === 'image')

  const renderItem = (key: string, label: string, count: number) => (
    <button
      key={key}
      className={`nav-item${active === key ? ' active' : ''}`}
      onClick={() => onSelect(key)}
    >
      <span className="label">{label}</span>
      <span className="count">{count}</span>
    </button>
  )

  const groupList = (groups: AssetIndex['groups']) =>
    groups.map((g) => renderItem(`${g.type}/${g.category}`, g.category, g.files.length))

  return (
    <aside className="sidebar">
      {renderItem('all', '全部素材', total)}
      <h3>图标</h3>
      {groupList(iconGroups)}
      <h3>图片</h3>
      {groupList(imageGroups)}
    </aside>
  )
}
