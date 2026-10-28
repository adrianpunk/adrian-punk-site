# Adrian.Punk — Portfolio

个人网站，极简黑白 + 橙色点缀。首页镜头钻进相机头人物的镜头里，落进镜头内部的六边形房间：五扇门各通向一个栏目（About / Tools / Writing / Parlour / Contact），第六面墙的舷窗里是他的 LED 脸。滚动环顾房间一圈后穿过 01 号门进入正文，也可以直接点任意一扇门进去。每扇门后有一个小 3D 世界（About：五块经历石碑；Tools：四台把输入变成输出的机器组成的流水线；Writing：作品隧道；Parlour：一盏橙灯下的双人桌；Contact：环绕橙色光球的联系方式），看完再进入内容页，点击或滚动可跳过。之后他作为向导站在页面右侧。

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

- `index.html` — 页面结构（Hero 滚动轨道 + About / Work / Contact）
- `src/main.js` — three.js 场景、模型加载、滚动驱动的镜头推进
- `src/led.js` — 镜头里的点阵 LED 脸：眼睛、均衡器、数字和图标（HI / ? / ♥ / 作品编号）
- `src/face.js` — 各页通知 LED 脸该显示什么
- `src/content.js` — 全站文案与数据（履历、工具、作品、报价、链接），改内容只改这里
- `src/render.js` — 把 content.js 渲染成各页
- `src/sound.js` — 萨克斯音轨（默认关闭）与频谱，驱动镜头里的 LED 均衡器
- `src/ui.js` — 光标、时钟、滚动渐显、波形播放器
- `src/waveform.json` — 音轨波形（换音频后需重新生成）
- `public/models/camera_head_sax.glb` — 3D 模型
- `public/audio/saxlele.mp3` — Adrian 自己的萨克斯录音
- `public/sessions/` — X 作品封面

新增一篇作品：把封面放进 `public/sessions/`，在 `src/content.js` 的 `sessions` 最前面加一行。

调镜头动画：`src/main.js` 里的 `LENS`（镜头位置/半径）、`.hero` 的高度（`src/style.css`，决定滚动距离）、以及 `frame()` 里各个 `smooth(a, b, p)` 区间。
