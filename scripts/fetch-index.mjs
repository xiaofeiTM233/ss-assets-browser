/**
 * 构建时从 GitHub 拉取 MakoStar/ss-assets 的文件树，生成素材索引 public/data/assets.json。
 * 每次部署（npm run build）强制刷新；API 失败时回退使用已存在的索引文件。
 * 可选环境变量 GITHUB_TOKEN：用于提升 GitHub API 速率限制。
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const REPO = 'MakoStar/ss-assets'
const BRANCH = 'main'
const PREFIX = 'export/assets/assetbundles/'
const OUT = path.resolve('public/data/assets.json')
const force = process.argv.includes('--force')

const headers = {
  'User-Agent': 'ss-assets-browser-build',
  Accept: 'application/vnd.github+json',
}
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`)
  return res.json()
}

function parseVersion(message) {
  const m = /update\s+([0-9][\w.]*)/.exec(message || '')
  return m ? m[1] : ''
}

async function build() {
  const tree = await fetchJSON(
    `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
  )
  if (tree.truncated) throw new Error('GitHub 文件树响应被截断')
  const commit = await fetchJSON(
    `https://api.github.com/repos/${REPO}/commits/${BRANCH}`,
  )

  const map = new Map()
  for (const item of tree.tree) {
    if (item.type !== 'blob' || !item.path.startsWith(PREFIX)) continue
    const segs = item.path.slice(PREFIX.length).split('/')
    if (segs.length < 2) continue
    const [type, category] = segs
    const name = segs.slice(2).join('/')
    const key = `${type}/${category}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({ n: name, s: item.size ?? 0 })
  }

  const groups = [...map.entries()]
    .map(([key, files]) => {
      const [type, category] = key.split('/')
      files.sort((a, b) => a.n.localeCompare(b.n, 'en'))
      return { type, category, files }
    })
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) || a.category.localeCompare(b.category),
    )

  const data = {
    generatedAt: new Date().toISOString(),
    repo: REPO,
    branch: BRANCH,
    commit: {
      sha: commit.sha,
      date: commit.commit?.committer?.date ?? '',
      message: commit.commit?.message ?? '',
      version: parseVersion(commit.commit?.message),
    },
    groups,
  }

  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(data))
  const count = groups.reduce((n, g) => n + g.files.length, 0)
  console.log(
    `[fetch-index] 已生成索引：${count} 个文件 / ${groups.length} 个分类 @ ${commit.sha.slice(0, 7)}`,
  )
}

try {
  if (existsSync(OUT) && !force) {
    console.log('[fetch-index] 索引已存在，跳过（npm run update-index 可强制刷新）')
  } else {
    await build()
  }
} catch (err) {
  if (existsSync(OUT)) {
    console.warn(`[fetch-index] 拉取失败（${err.message}），回退使用现有索引文件`)
  } else {
    console.error('[fetch-index] 拉取失败且无现有索引：', err.message)
    process.exit(1)
  }
}
