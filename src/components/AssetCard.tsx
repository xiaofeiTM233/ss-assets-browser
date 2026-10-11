import { fileUrl } from '../cdn'
import type { Item } from '../App'

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
        <span className="check">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
      <figcaption>{item.file.n}</figcaption>
    </figure>
  )
}
