# Adrian.Punk — Portfolio

个人网站。开屏是一个长长的对话框，自动打出 Welcome to Punk's blog（Welcome 的 W 和 Punk 的 P 更大），再按下右边的黑色发送箭头。首页镜头钻进相机头人物的镜头，穿过去是一条深空隧道：浏览量最高的 60 篇 X 长文按浏览量从高到低迎面飞来，尽头是一颗白色的土星，飞进去进入 About。About 是一句问候加三段介绍，链接都带图标，一屏放下。接着是 Works：整页左白右蓝，中间一本书，每一页就是一张封面从中间对折，翻一页换下一篇；Tutorials 30 篇、Prompts 30 篇。然后是黑底的 Journey（六个标题错落排开，指到哪个就在行内展开它的图）、Products（顶部是巨大的浅色水印 Creator’s Workflow；一条 3D 沙盘生产线，四台机器对应四个工具）、Chat（瑞士海报式排版：巨大的 Chat，一蓝一白两张错位的票，瑞士风排版、纸纹和压印字，票上是 Codex 画的手绘咖啡杯和电话；旁边一张圆桌，桌上一杯冒热气的咖啡），最后是黑色的 Contact，尾部会停住一段，Adrian.Punk 由几何笔画拼成，随滚动平滑地从左到右组装。左上角只有 Adrian.Punk（回到开头），右上角常驻音乐按钮、月牙（深色模式）、Work with me 和 MENU，MENU 从右侧滑出黑色目录。

字体：英文统一用 Inter Tight，数字用 Times New Roman，中文用黑体（苹方）；只有 About 的中文用朱雀仿宋（OFL，`public/fonts/zhuque-fangsong.woff2`，只含网站用到的字；改了中文文案后跑一次 `scripts/subset-zhuque.sh <朱雀仿宋.ttf>` 重新裁字），About 的数字也用 Inter Tight；开屏打字机仍是 Special Elite。从 About 开始，每页一屏高，滚动会停靠在页面上。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build   # 输出到 dist/
```

## 结构

- `index.html` — 页面结构（Hero 滚动轨道 + About / Works / Journey / Tools / Parlour / Contact）
- `src/main.js` — three.js 场景、模型加载、滚动驱动的镜头推进，以及进入隧道的衔接
- `src/space.js` — 深空隧道：星光拖尾、星云、60 张作品封面、黑洞着色器；点封面打开原文
- `src/led.js` — 镜头里的点阵 LED 脸：眼睛、均衡器、数字和图标（HI / ? / ♥ / 作品编号）
- `src/face.js` — 各页通知 LED 脸该显示什么
- `src/content.js` — 全站文案与数据（Journey、工具及其真实样例、作品、报价、链接、微信号），改内容只改这里
- `src/intro.js` — 开屏打字动画，每次访问播一次，点一下直接发送
- `src/wordmark.js` — 尾页几何拼装的 Adrian.Punk
- `src/line.js` — Tools 的 3D 生产线沙盘（three.js，只在屏幕内时渲染）
- `public/img/logos/` — About 里链接用的 logo
- `src/render.js` — 把 content.js 渲染成各页
- `src/sound.js` — 萨克斯音轨（默认关闭）与频谱，驱动镜头里的 LED 均衡器
- `src/ui.js` — 滚动渐显、音乐按钮、深色模式按钮、目录
- `src/theme.js` — 浅色 / 深色，记住选择，没选过就跟随系统
- `src/book.js` — Works 那本书：分页、翻页、分类跳转
- `src/table.js` — Parlour 的圆桌和咖啡（three.js）
- `src/waveform.json` — 音轨波形（换音频后需重新生成）
- `public/models/camera_head_sax.glb` — 3D 模型
- `public/audio/saxlele.mp3` — Adrian 自己的萨克斯录音
- `public/works/` — 60 篇 X 长文的封面（文件名前缀是浏览量排名）

新增一篇作品：把封面放进 `public/works/`，在 `src/content.js` 的 `works` 里按浏览量插入一行。书里的两类在同文件的 `tutorials` / `prompts` 两个列表里；书用的是 `public/works/book/<文章 id>.webp` 的大图（1600 宽）；`cover: null` 的会用标题排一张临时封面。

调镜头动画：`src/main.js` 里的 `LENS`（镜头位置/半径）、`DIVE`（钻镜头占整段滚动的比例）、`.hero` 的高度（`src/style.css`，决定滚动距离）、以及 `frame()` 里各个 `smooth(a, b, p)` 区间。

模型压缩：`public/models/camera_head_sax.glb` 是压缩过的（26.7 MB → 1.5 MB：meshopt 几何压缩、简化、贴图转 1024 的 WebP），`src/main.js` 里用 `MeshoptDecoder` 解码。换新模型时用同样的命令压一遍：

```bash
npx @gltf-transform/cli optimize 原始模型.glb public/models/camera_head_sax.glb --compress meshopt --texture-compress webp --texture-size 1024
```
