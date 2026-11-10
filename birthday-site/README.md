# Alles Gute

「一封会播放的信」沉浸式生日网页。

## 本地预览

直接双击 `index.html` 即可阅读。唱机使用浏览器本地音频，通过拖动唱针或点击落点开始播放。

## 替换内容

所有文字和素材入口集中在 `js/content.js`：

- `friendName`：朋友昵称
- `senderName`：你的署名
- `opening`：开场中文说明
- `audio.src`：你提供的本地音乐文件
- `photos`：照片路径、替代文字、构图位置与说明
- `letter.groups`：按 `first`、`distance`、`small`、`core` 四组排列信件自然段
- `letter.closing`、`letter.signature`：结尾与署名
- `finale`：生日页文案

把照片放进 `assets/images/`，音乐放进 `assets/audio/`。信件段落会按数组顺序显示，建议保持原信自然段顺序，只做轻度润色。

## 当前示例内容

- 昵称与署名是通用占位。
- 四张照片为开放授权示例，正式发布前应替换为私人照片。
- `assets/audio/ambient.wav` 是原创程序化示意音轨，收到你的音乐后直接替换。
- 信件正文为不涉及具体事件的演示文本，收到原信后需全部替换。

## 发布

Netlify 将 Base directory 设为 `birthday-site`，无需构建命令，发布目录为 `.`。页面已设置 `noindex, nofollow`，不包含口令保护。

## 文件

- `index.html`：完整语义内容
- `css/`：基础、开场、唱机、回忆章节与结尾样式
- `js/`：内容配置、内容绑定、唱机与音频交互
- `assets/`：图片、音轨与授权说明
