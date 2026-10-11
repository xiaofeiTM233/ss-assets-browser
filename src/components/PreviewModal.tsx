import { useEffect } from 'react'
import { fileUrl, formatBytes } from '../cdn'
import type { Item } from '../App'
import {
  CopyOutlined,
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Button, Modal, Space, Tooltip, Typography } from 'antd'

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
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      else if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasPrev, hasNext, onPrev, onNext])

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={1160}
      centered
      title={null}
      closeIcon
    >
      <div className="preview-body">
        <img className="preview-img" src={url} alt={item.file.n} />
        <div className="modal-bar">
          <Typography.Text
            type="secondary"
            className="modal-name"
            title={item.rel}
            ellipsis
          >
            {item.rel}
          </Typography.Text>
          <Typography.Text type="secondary" className="modal-size">
            {formatBytes(item.file.s)}
          </Typography.Text>
          <span className="spacer" />
          <Space wrap>
            <Button icon={<CopyOutlined />} onClick={() => onCopy(url)}>
              复制链接
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadFile(url, item.file.n)}
            >
              下载
            </Button>
          </Space>
        </div>
      </div>
      {hasPrev && (
        <Tooltip title="上一个（←）">
          <Button
            className="nav-arrow prev"
            shape="circle"
            icon={<LeftOutlined />}
            onClick={onPrev}
          />
        </Tooltip>
      )}
      {hasNext && (
        <Tooltip title="下一个（→）">
          <Button
            className="nav-arrow next"
            shape="circle"
            icon={<RightOutlined />}
            onClick={onNext}
          />
        </Tooltip>
      )}
    </Modal>
  )
}
