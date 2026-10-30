# Ray / Notes

个人公开手记与互动卷轴网站。

- GitHub Pages：<https://rayzzz1101-coder.github.io/>
- Cloudflare API：<https://ray-question-box.ray-questionbox.workers.dev/>
- 后台：<https://rayzzz1101-coder.github.io/admin.html>

## 结构

- `three-lab/`：Vite 静态前端源码
- `deploy/`：Cloudflare Worker、D1 迁移和部署配置
- `.github/workflows/deploy-pages.yml`：GitHub Pages 自动构建与发布

## 本地开发

```sh
cd three-lab
npm run dev
```

本地开发使用内置 Mock 数据，不会污染线上 D1。

## 发布

推送到 `main` 后，GitHub Actions 会自动构建并发布 `three-lab/dist`。

更新 Cloudflare API：

```sh
env PATH=/Users/zzz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin \
  /Users/zzz/Documents/ChatGPT/play/node_modules/.bin/wrangler \
  deploy --config deploy/wrangler.toml
```

更详细的开发、后台接口和测试说明见 `three-lab/README.md`。
