/**
 * 构建时从 GitHub 拉取 MakoStar/ss-assets 的文件树，生成素材索引 public/data/assets.json。
 *
 * 数据来源优先级：
 *   1. GitHub REST API（建议配置 GITHUB_TOKEN，否则共享构建 IP 极易触发 403 限流）
 *   2. git 稀疏克隆（无需令牌：只拉取提交与目录树，不下载图片；不包含文件体积）
 *
 * 每次部署（npm run build）强制刷新；全部来源失败时回退使用已存在的索引文件。
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const REPO = 'MakoStar/ss-assets'
const BRANCH = 'main'
const PREFIX = 'export/assets/assetbundles/'
const OUT = path.resolve('public/data/assets.json')
const force = process.argv.includes('--force')

const exec = promisify(execFile)

const headers = {
  'User-Agent': 'ss-assets-browser-build',
  Accept: 'application/vnd.github+json',
}
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`)
  return res.json()
}

function parseVersion(message) {
  const m = /update\s+([0-9][\w.]*)/.exec(message || '')
  return m ? m[1] : ''
}

/** 把 [{ path, size }] 按 type/category 归组并生成索引 */
function makeIndex(entries, commit) {
  const map = new Map()
  for (const { path: p, size } of entries) {
    if (!p.startsWith(PREFIX)) continue
    const segs = p.slice(PREFIX.length).split('/')
    if (segs.length < 3) continue
    const [type, category] = segs
    const name = segs.slice(2).join('/')
    const key = `${type}/${category}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({ n: name, s: size })
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

  return {
    generatedAt: new Date().toISOString(),
    repo: REPO,
    branch: BRANCH,
    commit,
    groups,
  }
}

async function buildFromApi() {
  const tree = await fetchJSON(
    `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
  )
  if (tree.truncated) throw new Error('GitHub 文件树响应被截断')
  const commit = await fetchJSON(
    `https://api.github.com/repos/${REPO}/commits/${BRANCH}`,
  )

  const entries = tree.tree
    .filter((item) => item.type === 'blob')
    .map((item) => ({ path: item.path, size: item.size ?? 0 }))

  const message = commit.commit?.message ?? ''
  return {
    index: makeIndex(entries, {
      sha: commit.sha,
      date: commit.commit?.committer?.date ?? '',
      message,
      version: parseVersion(message),
    }),
    source: 'GitHub API',
  }
}

/** 无需令牌的兜底：只拉取 git 对象树（约几百 KB），不下载图片；文件体积记为 0 */
async function buildFromGit() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ss-assets-'))
  try {
    await exec(
      'git',
      [
        'clone',
        '--filter=blob:none',
        '--no-checkout',
        '--depth',
        '1',
        '--quiet',
        `https://github.com/${REPO}.git`,
        dir,
      ],
      { timeout: 180_000 },
    )

    const { stdout: log } = await exec('git', [
      '-C',
      dir,
      'log',
      '-1',
      '--format=%H%n%cI%n%s',
    ])
    const [sha, date, ...rest] = log.trim().split('\n')
    const message = rest.join('\n')

    const { stdout: list } = await exec(
      'git',
      ['-C', dir, 'ls-tree', '-r', '--name-only', 'HEAD'],
      { maxBuffer: 32 * 1024 * 1024 },
    )
    const entries = list
      .split('\n')
      .filter(Boolean)
      .map((p) => ({ path: p, size: 0 }))

    return {
      index: makeIndex(entries, {
        sha: sha ?? '',
        date: date ?? '',
        message,
        version: parseVersion(message),
      }),
      source: 'git 稀疏克隆',
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function build() {
  let result
  try {
    result = await buildFromApi()
  } catch (apiErr) {
    const hint = process.env.GITHUB_TOKEN
      ? ''
      : '（建议在 CI 中配置 GITHUB_TOKEN 以提升速率限制）'
    console.warn(`[fetch-index] GitHub API 失败：${apiErr.message}${hint}`)
    console.warn('[fetch-index] 改用 git 稀疏克隆…')
    result = await buildFromGit()
  }

  const { index, source } = result
  const count = index.groups.reduce((n, g) => n + g.files.length, 0)
  if (source === 'git 稀疏克隆') {
    console.warn('[fetch-index] 兜底来源不包含文件体积（预览中不显示大小）')
  }

  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(index))
  console.log(
    `[fetch-index] 索引已生成（来源：${source}）：${count} 个文件 / ${index.groups.length} 个分类 @ ${index.commit.sha.slice(0, 7)}`,
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
