/** 仓库内素材相对路径前缀 */
export const REL_PREFIX = 'export/assets/assetbundles/'

export interface CdnSource {
  id: string
  label: string
  base: string
}

const REPO_PATH = 'gh/MakoStar/ss-assets@main/'

export const CDN_SOURCES: CdnSource[] = [
  { id: 'jsdelivr', label: 'jsDelivr', base: `https://cdn.jsdelivr.net/${REPO_PATH}` },
  { id: 'fastly', label: 'Fastly jsDelivr', base: `https://fastly.jsdelivr.net/${REPO_PATH}` },
  { id: 'cf', label: 'CF jsDelivr', base: `https://cf.jsdelivr.net/${REPO_PATH}` },
  { id: 'jsdmirror', label: 'JSDMirror', base: `https://cdn.jsdmirror.com/${REPO_PATH}` },
  { id: 'jsdmirror-cn', label: 'JSDMirror CN', base: `https://cdn.jsdmirror.cn/${REPO_PATH}` },
]

export type CdnId = string

/** 将仓库相对路径编码为完整 CDN 地址（文件名中的 # 等特殊字符会被正确编码） */
export function fileUrl(base: string, relPath: string): string {
  return base + relPath.split('/').map(encodeURIComponent).join('/')
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
