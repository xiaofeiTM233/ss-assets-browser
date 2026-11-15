/**
 * 定时检查 MakoStar/ss-assets 的最新提交，与线上索引中的提交比对，
 * 不一致时调用 Workers Builds Deploy Hook 触发重新部署。
 *
 * 该脚本与站点静态资源由同一个 Worker 提供（见根目录 wrangler.jsonc）。
 *
 * 环境变量：
 *   DEPLOY_HOOK_URL Workers Builds Deploy Hook（在控制台或通过 wrangler secret 配置）
 */

const UPSTREAM_ATOM = 'https://github.com/MakoStar/ss-assets/commits/main.atom'

async function latestUpstreamSha() {
  const res = await fetch(UPSTREAM_ATOM, {
    headers: { 'User-Agent': 'ss-assets-deploy-checker' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`上游提交读取失败：HTTP ${res.status}`)
  const sha = /Grit::Commit\/([0-9a-f]{40})/.exec(await res.text())?.[1]
  if (!sha) throw new Error('无法解析上游提交')
  return sha
}

async function deployedSha(env) {
  try {
    const res = await env.ASSETS.fetch(
      new Request('https://assets.internal/data/assets.json'),
    )
    if (!res.ok) return ''
    return (await res.json()).commit?.sha ?? ''
  } catch {
    return ''
  }
}

async function checkAndDeploy(env) {
  const upstream = await latestUpstreamSha()
  const live = await deployedSha(env)
  if (live && live === upstream) {
    return { changed: false, upstream, live }
  }

  if (!env.DEPLOY_HOOK_URL) throw new Error('未配置 DEPLOY_HOOK_URL')
  const res = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' })
  if (!res.ok) throw new Error(`触发部署失败：HTTP ${res.status}`)

  return { changed: true, triggered: true, upstream, live: live || 'unknown' }
}

export default {
  /** Cron Trigger 入口 */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      checkAndDeploy(env).catch((err) => console.error('[check]', err.message)),
    )
  },

  /** 访问 /api/check 可手动执行一次检查，便于验证配置；其余请求交给静态资源 */
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname !== '/api/check') {
      if (env.ASSETS) return env.ASSETS.fetch(request)
      return new Response('Not Found', { status: 404 })
    }
    try {
      return Response.json(await checkAndDeploy(env))
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 })
    }
  },
}
