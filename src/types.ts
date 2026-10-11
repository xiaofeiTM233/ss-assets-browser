export interface AssetFile {
  /** 文件名 */
  n: string
  /** 字节大小 */
  s: number
}

export interface AssetGroup {
  type: 'icon' | 'image'
  category: string
  files: AssetFile[]
}

export interface AssetIndex {
  generatedAt: string
  repo: string
  branch: string
  commit: {
    sha: string
    date: string
    message: string
    version: string
  }
  groups: AssetGroup[]
}
