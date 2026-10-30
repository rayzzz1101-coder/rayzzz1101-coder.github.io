# Ray / Notes 个人主页

一份会拆开、会回信的公开手记。落地页使用一枚可以拖动、但不会打开真实信件的 Three.js 信封；六篇手记放在独立的 `notes.html` 中，继续沿用原来的抽纸、展开和全文阅读界面。落地页的后续章节使用轻量纸张层承载印象泡泡、照片雨、三步采访与审核后问答。

## 启动

```sh
./three-lab/run.sh
```

默认地址为 <http://127.0.0.1:5173>。生产构建：

```sh
cd three-lab
../.tools/node/bin/npm run build
```

`dist/index.html` 是落地页，`dist/notes.html` 是六封信独立页面，不需要服务端路由。

## 线上站点与后台

- 公开网站：<https://rayzzz1101-coder.github.io/>
- 私密后台：<https://rayzzz1101-coder.github.io/admin.html>
- Cloudflare 回退站点：<https://ray-question-box.ray-questionbox.workers.dev/>

公开页面由 GitHub Pages 自动构建和托管；数据、鉴权与管理 API 由腾讯云
CloudBase HTTP 云函数和 PostgreSQL 提供。原来的 `ray-question-box`
Cloudflare Worker 和 D1 数据库保留为回退入口。

```sh
git push origin main
ADMIN_TOKEN="$(cat /path/to/.admin-token)" \
  tcb fn deploy --cwd deploy/cloudbase --all --force
```

## 独立印象工作页

`/impressions.html` 是只包含印象模块的独立工作页，不会加载主页信封、照片雨或其他章节。主页顶部“02 / 印象”现在直接滚动到主页内嵌的新版泡泡区；独立页保留为旧版内容工作区。

- 页面结构：`impressions.html`
- 独立交互：`src/impressions-page.js`
- 独立视觉覆盖：`src/impressions-page.css`
- 共享数据与接口：`src/content.js`、`src/api.js`

在这个工作页完成修改后，再把对应的 HTML、CSS 和交互同步回 `index.html` 与 `src/site.js`。

## 独立泡泡源文件

`/bubbles.html` 是只保留泡泡画布的独立源文件，不加载主页、信封、照片雨、采访表单或共享站点样式。需要继续设计和调整泡泡时，直接修改以下三个文件即可：

- 页面结构：`bubbles.html`
- 视觉样式：`src/bubbles-page.css`
- 数据与交互：`src/bubbles-page.js`

`src/bubbles-page.js` 顶部的 `BUBBLE_CONFIG` 控制泡泡尺寸、数量和初始间距，`DEFAULT_SURFACE` 控制右侧五个材质滑杆。当前页面使用 Three.js 的 `MeshPhysicalMaterial` 渲染透光球体，可实时调整粗糙度、清漆高光、透光率、法线强度和表面起伏；`IMPRESSIONS` 可直接替换成自己的词条。主页嵌入同一个场景，因此这里的视觉和物理修改会同步出现在主页印象区。

主页通过 `/bubbles.html?embed=1` 复用同一套泡泡场景。嵌入模式会隐藏实验室导航、参数面板和独立读数，只保留画布与交互；选中词条通过 `postMessage` 同步到主页右侧说明。

单独验证：

```sh
.venv/bin/python three-lab/tests/verify_bubbles_page.py \
  --url http://127.0.0.1:5173/bubbles.html \
  --out three-lab/review-bubbles-page
```

## 独立采访组件

`/interview.html` 是三步印象采访的独立设计页。纸面和左右卷轴杆由 Three.js 建模渲染，保留整页切题位移、提交状态和最终卷轴收合效果，不加载主页其他章节。

- 页面结构：`interview.html`
- 独立样式：`src/interview-page.css`
- 独立交互：`src/interview-page.js`
- Three.js 卷轴模型：`src/interview-scroll-scene.js`

纸面使用程序生成的羊皮纸纹理，轴杆由圆柱、轴帽和 PBR 材质构成；提交时两侧轴杆会由场景内动画向中央合并。独立页和主页采访区共用同一个 Three.js 卷轴组件。

## 独立卷轴对象

`/scroll.html` 是只包含 Three.js 卷轴模型的展示页，不含表单或其他主页章节。

- 页面结构：`scroll.html`
- 页面样式：`src/scroll-page.css`
- 卷起/展开交互：`src/scroll-page.js`
- 共用卷轴模型：`src/interview-scroll-scene.js`

模型使用程序生成的羊皮纸纹理、细分纸面网格、左右圆柱轴杆和 PBR 光照。纸面包含连续的三屏内容，分别显示 `1 / 2 / 3`；切换页面时纹理与文字向左移动，同时轴杆绕自身轴旋转。第三屏之后点击“收纸”，纸面和两端轴杆会合并为一个中心卷轴；也可以重新展开。

## API 适配

本地 Vite 开发模式默认使用 Mock 数据。GitHub Actions 在构建时将
`VITE_API_BASE_URL` 设置为 CloudBase HTTP 云函数地址。如需在本地连接其他
API 域名，创建 `.env.local`：

```sh
VITE_API_BASE_URL=https://evident-flamingo-d1ez1ke6e21c393-1521256935.ap-shanghai.app.tcloudbase.com/ray-api
```

前端调用以下接口：

- `GET /api/v1/impressions`：返回 `{ items: [{ id, label, count }] }`。
- `GET /api/v1/questions?visibility=published`：返回 `{ items: [{ id, question, answer, askedAt, displayName? }] }`。
- `POST /api/v1/questions`：提交 `question`、`displayName`、`consentToPublish`、`requestId` 与蜜罐字段。
- `POST /api/v1/interviews`：提交三项回答、`consentToKeywords` 与 `requestId`。

后台使用现有 `ADMIN_TOKEN`：

- `GET /api/v1/interviews/admin`
- `POST /api/v1/interviews/:id/keywords`
- `GET /api/questions/admin`
- `POST /api/questions/:id/answer`

真实 API 只应向公开接口返回审核完成的数据。访谈原文和联系方式不得出现在公开响应中。后台需要完成 AI 候选词建议、人工合并同义词、去重计数和发布状态管理；同一访客重复提到同一关键词只计一次。

建议公开问题状态：`pending → answered → published`。`published` 之前的问答不会出现在页面。

## 内容与素材

- `src/content.js`：六篇手记、照片故事、Mock 印象和问答。
- `public/note-images/`：原始与按宽度优化的 JPEG；优化版本已移除过期 EXIF 方向信息。
- 新照片可先加入该目录和 `src/content.js`，后续直接替换成 API 返回值，无需改页面组件。
- `.env`、`.env.local` 不会进入版本库；不要把后台密钥写入前端环境变量。

## 交互约定

- 落地页信封只响应原位倾斜、晃动与惯性，不跟随鼠标平移，也不打开手记；点击“手记”进入独立六封信页面。
- 落地页左上角使用放大的 `RAY / NOTES` 字标，竖排手记按钮位于信封右侧。切换手记时，页面文字先淡出，信封向右离场；手记页的信封从右侧入场，随后文字出现。
- 手记页使用信封右侧的竖排“回到主页”入口。返回时执行同样的文字淡出、信封右出、主页信封右入和文字恢复动画；顶部不再放置重复返回按钮。
- 独立手记页支持滚轮、方向键和拖动切换六封信。
- 独立泡泡页允许自由拖动，松手后保留落点并带惯性滑行；文字以弹簧阻尼延迟跟随并回到中心。泡泡的形变轴会跟随拖动速度方向，松开后再通过弹性振荡恢复。
- 泡泡使用圆形质量碰撞，不会互相穿透；体积越大的泡泡质量越大、向心作用越强，也更不容易被小泡泡推开。选中状态只更新左下角信息读数，不再绘制红色描边；读数切换时旧文字从左向右擦除，新文字再从左侧向右显现。
- 三步采访切换问题时，题目和输入内容随纸面同步移动，并在轴杆内侧裁切。提交成功后文字先无变形淡出，纸面与轴杆完成收拢动画。
- 照片雨同时最多出现四张，按四条独立轨道错峰、错速下落，可以直接拖拽；掉落后会回到最近的空闲轨道继续下落。
- 掉落中的照片使用固定宽高比和胶片边框；落出画面后循环生成下一批，不再堆叠到页面底部。
- 提问箱已经取消联系方式字段，只保留问题、可选署名与公开授权。

## 验证

开发服务器运行时，在项目根目录执行：

```sh
.venv/bin/python three-lab/tests/verify_portfolio.py \
  --url http://127.0.0.1:5173 \
  --out three-lab/review-public-home
```

脚本使用本机 Chrome 检查桌面 1440×1000、移动端 390×844、减少动效模式、封面信封拖动、独立手记页面、泡泡拖动惯性、三步采访、照片详情、提问提交和横向溢出。截图与 `functional-results.json` 会写入指定目录。

独立印象页可单独验证：

```sh
.venv/bin/python three-lab/tests/verify_impressions_page.py \
  --url http://127.0.0.1:5173/impressions.html \
  --out three-lab/review-impressions-page
```

`envelope-material-lab.html`、`wax-seal-lab.html` 和 `material-plan.html` 保留为材质实验文件，不进入生产构建。
