# Ray / Notes

个人公开手记与互动卷轴网站。

- GitHub Pages：<https://rayzzz1101-coder.github.io/>
- CloudBase API：<https://evident-flamingo-d1ez1ke6e21c393-1521256935.ap-shanghai.app.tcloudbase.com/ray-api>
- Cloudflare API 回退：<https://ray-question-box.ray-questionbox.workers.dev/>
- 后台：<https://rayzzz1101-coder.github.io/admin.html>

## 结构

- `three-lab/`：Vite 静态前端源码
- `deploy/cloudbase/`：CloudBase PostgreSQL、HTTP 云函数和导出工具
- `deploy/`：Cloudflare 回退服务、D1 迁移和部署配置
- `.github/workflows/deploy-pages.yml`：GitHub Pages 自动构建与发布

## 本地开发

```sh
cd three-lab
npm run dev
```

本地开发使用内置 Mock 数据，不会污染线上数据库。

## 发布

推送到 `main` 后，GitHub Actions 会自动构建并发布 `three-lab/dist`。

更新 CloudBase API：

```sh
ADMIN_TOKEN="$(cat /path/to/.admin-token)" \
  tcb fn deploy --cwd deploy/cloudbase --all --force
```

Cloudflare 服务仍保留为回退入口，不参与正式页面的实时读写。

更详细的开发、后台接口和测试说明见 `three-lab/README.md`。
