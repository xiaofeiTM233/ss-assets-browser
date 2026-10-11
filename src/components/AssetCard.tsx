import { fileUrl } from '../cdn'
import type { Item } from '../App'
import { Checkbox } from 'antd'

interface AssetCardProps {
  item: Item
  cdnBase: string
  multi: boolean
  selected: boolean
  onClick: () => void
}

export default function AssetCard({
  item,
  cdnBase,
  multi,
  selected,
  onClick,
}: AssetCardProps) {
  return (
    <figure
      className={`card${selected ? ' selected' : ''}`}
      title={item.rel}
      onClick={onClick}
    >
      <div className="thumb">
        <img
          src={fileUrl(cdnBase, item.rel)}
          alt={item.file.n}
          loading="lazy"
          decoding="async"
        />
      </div>
      {multi && (
        <span
          className="check"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          <Checkbox
            checked={selected}
            style={{ pointerEvents: 'none' }}
          />
        </span>
      )}
      <figcaption>{item.file.n}</figcaption>
    </figure>
  )
}
