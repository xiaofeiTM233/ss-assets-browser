# SS 素材库

浏览 [MakoStar/ss-assets](https://github.com/MakoStar/ss-assets) 素材库的快捷查阅 / 调取应用，部署于 Cloudflare Pages。每次构建时自动从 GitHub 拉取最新素材索引，无需手动维护数据。

## 功能

- 分类浏览：图标（48 类）+ 图片（3 类），共 8000+ 个 webp 素材
- 文件名搜索（跨分类）
- 大图预览：支持 ← / → 切换、Esc 关闭，显示文件路径与体积
- 一键复制 CDN 链接、下载单张图片
- 批量选择：勾选多张后复制全部链接
- CDN 源切换：jsDelivr / Fastly jsDelivr / CF jsDelivr / JSDMirror / JSDMirror CN
- 记住上次选中的分类与 CDN 源
- 显示当前索引对应的游戏版本号与提交信息

## 技术栈

React 19 · Vite · TypeScript · Ant Design 6（暗色主题）

## 数据更新机制

构建命令会先执行 `scripts/fetch-index.mjs`：

1. 调用 GitHub API 获取 ss-assets 仓库的完整文件树与最新提交
2. 生成索引文件 `public/data/assets.json`（分类、文件名、体积、版本号）
3. 页面运行时加载该索引，图片直接从 jsDelivr 系 CDN 加载（不经过应用服务器）

- 若 API 请求失败，自动回退使用仓库中已提交的旧索引，保证构建不中断
- 可选环境变量 `GITHUB_TOKEN`：提升 GitHub API 速率限制（建议在 CI 中配置）

## 本地开发

```bash
npm install
npm run dev          # 启动开发服务器（索引已存在时跳过拉取）
npm run update-index # 强制重新拉取最新索引
npm run build        # 构建（强制拉取最新索引 + 类型检查 + 打包）
npm run preview      # 本地预览构建产物
```

## 部署到 Cloudflare Pages

1. 将本仓库推送到 GitHub
2. Cloudflare 控制台 → Workers & Pages → Create → Pages → Connect to Git，选择该仓库
3. 构建配置：
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - 环境变量（可选）：`GITHUB_TOKEN` = GitHub Personal Access Token；`NODE_VERSION` = `22`（仓库已内置 `.node-version`）
4. 保存后自动部署，此后每次 `git push` 都会拉取最新素材数据并重新构建

## 目录结构

```
├── scripts/fetch-index.mjs   # 构建时从 GitHub 拉取素材索引
├── public/data/assets.json   # 生成的索引文件（已提交，作为回退）
├── public/favicon.svg
└── src/
    ├── App.tsx               # 主界面（布局 / 状态 / 过滤逻辑）
    ├── cdn.ts                # CDN 源定义与 URL 编码
    ├── types.ts              # 索引数据结构
    ├── main.tsx              # 入口（antd 暗色主题配置）
    ├── styles.css
    └── components/
        ├── AssetCard.tsx     # 素材卡片
        └── PreviewModal.tsx  # 大图预览弹窗
```
