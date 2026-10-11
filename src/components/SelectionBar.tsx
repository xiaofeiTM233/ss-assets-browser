import { IconClose, IconCopy } from '../icons'

interface SelectionBarProps {
  count: number
  onCopy: () => void
  onClear: () => void
  onClose: () => void
}

export default function SelectionBar({
  count,
  onCopy,
  onClear,
  onClose,
}: SelectionBarProps) {
  return (
    <div className="selection-bar">
      <span className="count">已选 {count} 项</span>
      <button className="btn primary" onClick={onCopy}>
        <IconCopy size={14} /> 复制链接
      </button>
      <button className="btn" onClick={onClear}>
        清空
      </button>
      <button className="icon-btn" title="退出批量选择" onClick={onClose}>
        <IconClose size={16} />
      </button>
    </div>
  )
}
