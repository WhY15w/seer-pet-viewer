# 赛尔号 Unity 精灵动画在线查看器

在浏览器中查看赛尔号 Unity 端精灵的待机、出招等动画（`ppets_*` AssetBundle）。

## 技术栈

- mise + pnpm + TypeScript + Vue 3 + Vite
- PixiJS（WebGL 渲染）
- UnityPy（开发期分析，可选 CLI 预转换）

## 快速开始

```bash
mise install
pnpm install
pnpm dev
```

## 示例文件

将 `ppets_*` bundle 拖入查看器，或使用 `examples/` 目录中的样本。

## CLI 预转换

```bash
pnpm export examples/ppets_70
```

生成 `.swfclip` 目录（`meta.json` + `atlas.png`），可在查看器中快速加载。

## 部署

```bash
pnpm build
# 输出在 apps/viewer/dist，可部署到 GitHub Pages / Cloudflare Pages
```

### 远程资源与跨域代理

生产环境浏览器无法直连 `newseer.61.com`（无 CORS 头）。远程加载 bundle 需配置反向代理：

1. 部署 [workers/bundle-proxy-cloudflare](workers/bundle-proxy-cloudflare) 到 Cloudflare Workers：
   ```bash
   cd workers/bundle-proxy-cloudflare && pnpm install && pnpm deploy:cloudflare
   ```
   或在仓库根目录执行 `pnpm deploy:proxy-cloudflare`。
2. 配置代理地址（二选一）：
   - **GitHub Actions 部署**：在仓库 **Settings → Secrets and variables → Actions → Variables** 添加变量  
     `VITE_BUNDLE_PROXY_PREFIX` = `https://your-worker.workers.dev`
   - **本地构建**：在 `apps/viewer/.env.production` 写入同上地址
3. 重新构建并部署。

GitHub Actions 工作流（[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)）会在每次部署前：
- 从 `newseer.61.com` 拉取完整清单并生成 `pet-anim-index.json`
- 将 `VITE_BUNDLE_PROXY_PREFIX` 注入 Vite 生产构建

开发环境默认通过 Vite `/proxy` 转发，无需额外配置。

更新资源索引（从 newseer.61.com 远程拉取完整清单）：

```bash
pnpm build:index
# 或离线使用已下载的 .bytes 文件：
# node tools/build-pet-index.mjs --local path/to/PackageManifest_PetAnimPackage_*.bytes --version 20260625181040
```

未配置代理时，远程资源选择器会自动隐藏，仍可本地导入 bundle。

### 通过 URL 直接打开精灵

在已配置远程资源代理的部署环境中，可通过查询参数自动加载指定精灵，无需在列表中手动选择。

```
https://nattsu39.github.io/seer-pet-viewer/?pet=1234
```

| 参数 | 说明 |
|------|------|
| `pet` | 精灵 ID（如 `1234`），或 bundle 名称（`ppets_1234`、`pskilltimeline_spines_4000`） |
| `kind` | 可选，显式指定格式：`swf` 或 `spine` |
| `variant` | 可选，设为 `small` 时打开小体型 SWF（`ppets_*_small`） |

仅填写数字 ID 时，会同时匹配 SWF（`ppets_{id}`）与 Spine（`pskilltimeline_spines_{id}`）两种命名；若同一 ID 存在多种资源，默认优先 Spine，其次常规 SWF，最后小体型 SWF。

示例：

- `?pet=1234` — 打开 ID 为 1234 的精灵
- `?pet=4000` — 打开 Spine 技能时间轴动画 `pskilltimeline_spines_4000`
- `?pet=132&variant=small` — 打开小体型 SWF `ppets_132_small`
- `?pet=1234&kind=swf` — 强制使用 SWF 格式

本地开发时同样可用，例如 `http://localhost:5173/?pet=1234`（需 Vite `/proxy` 可用）。

## ‌致谢
[@聿聿](https://github.com/WhY15w)
