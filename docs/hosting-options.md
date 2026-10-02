# 小游戏上线：简单、低成本的托管选择

资料核对日期：2026-10-02。本文只比较静态网站托管。

## 这个项目需要什么

仓库使用 Vite、React 和 Phaser，`npm run build` 会生成静态文件；Vite 默认输出目录是 `dist`。关卡和解答是 `public/data` 下的静态 JSON，游戏进度写入浏览器 `localStorage`，目前没有服务端 API 或数据库需求。因此，现阶段不需要租 VPS：把构建出的 `dist` 目录放到静态主机即可。参考：[package.json](../package.json)、[Vite 配置](../vite.config.ts)、[进度存储](../src/progression/storage.ts)、[Vite 静态部署说明](https://vite.dev/guide/static-deploy.html)。

## 选项对比

| 主机 | 免费档与主要限制 | 适合什么情况 |
|---|---|---|
| [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) | GitHub Free 仅支持公开仓库；发布站点上限 1 GB，软带宽限额 100 GB/月，软构建限额 10 次/小时。 | 代码本来就在 GitHub，且可以公开时，和代码托管放在一起最直接。Vite 的项目站点通常位于 `/<仓库名>/`，须按 [Vite 指南](https://vite.dev/guide/static-deploy.html#github-pages)设置 `base` 并配置 Pages 工作流。 |
| [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/) | Free 每月 500 次构建、同时 1 次，构建超时 20 分钟；每站最多 20,000 个文件、单个文件最多 25 MiB。静态资源请求在免费和付费方案都免费且不限量，见 [Pages 定价说明](https://developers.cloudflare.com/pages/functions/pricing/)。 | **推荐作为本项目的默认选择。** 可连接公开或私有 GitHub 仓库；官方 React (Vite) 预设使用 `npm run build` 和 `dist`，见[构建设置](https://developers.cloudflare.com/pages/configuration/build-configuration/)及[Git 集成步骤](https://developers.cloudflare.com/pages/get-started/git-integration/)。推送代码后自动构建发布，也不需要为项目仓库子路径修改 Vite 的 `base`。 |
| [Netlify](https://www.netlify.com/pricing/) | Free 为 $0，每月 300 credits；生产部署每次 15 credits，流量每 GB 20 credits。额度用在部署和流量上，要留意用量。 | 想尽快手动试发时，可按[官方拖放流程](https://docs.netlify.com/welcome/add-new-site/)上传 `dist`；后续更新需重新构建并上传。 |

## 建议

若想要每次推送自动更新，又希望仓库可以保持私有，选 **Cloudflare Pages Free**：连接 GitHub 仓库，选择 React (Vite) 预设，确认构建命令为 `npm run build`、输出目录为 `dist`，然后发布。若仓库可公开、且想让发布和代码都留在 GitHub，GitHub Pages 也够用，但要处理 Vite 的仓库路径设置。Netlify 拖放适合先试发一次；常更新时 Git 集成更省事。

