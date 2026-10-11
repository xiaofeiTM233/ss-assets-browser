import { useEffect } from 'react'
import { fileUrl, formatBytes } from '../cdn'
import type { Item } from '../App'
import { IconChevronLeft, IconChevronRight, IconClose, IconCopy, IconDownload } from '../icons'

interface PreviewModalProps {
  item: Item
  cdnBase: string
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onCopy: (text: string) => void
}

async function downloadFile(url: string, name: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {
    window.open(url, '_blank')
  }
}

export default function PreviewModal({
  item,
  cdnBase,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onCopy,
}: PreviewModalProps) {
  const url = fileUrl(cdnBase, item.rel)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      else if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasPrev, hasNext, onPrev, onNext, onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <img src={url} alt={item.file.n} />
        <div className="modal-bar">
          <span className="modal-name" title={item.rel}>
            {item.rel}
          </span>
          <span className="modal-size">{formatBytes(item.file.s)}</span>
          <span className="spacer" />
          <button className="btn" onClick={() => onCopy(url)}>
            <IconCopy size={14} /> 复制链接
          </button>
          <button className="btn" onClick={() => downloadFile(url, item.file.n)}>
            <IconDownload size={14} /> 下载
          </button>
          <button className="btn" onClick={onClose}>
            <IconClose size={14} /> 关闭
          </button>
        </div>
      </div>
      {hasPrev && (
        <button
          className="nav-arrow prev"
          title="上一个（←）"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
        >
          <IconChevronLeft size={20} />
        </button>
      )}
      {hasNext && (
        <button
          className="nav-arrow next"
          title="下一个（→）"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
        >
          <IconChevronRight size={20} />
        </button>
      )}
    </div>
  )
}
