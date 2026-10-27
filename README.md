# Adrian.Punk — Portfolio

个人网站。首页是一个相机头人物吹萨克斯的 3D 模型（three.js），向下滚动时镜头一路推进到相机镜头里，穿过镜头后的 LED 屏直接落到下一页。

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
- `src/led.js` — 镜头里的点阵 LED 眼睛（跟随鼠标、眨眼、推进时闭眼）
- `src/ui.js` — 光标、时钟、滚动渐显
- `public/models/camera_head_sax.glb` — 3D 模型

调镜头动画：`src/main.js` 里的 `LENS`（镜头位置/半径）、`.hero` 的高度（`src/style.css`，决定滚动距离）、以及 `frame()` 里各个 `smooth(a, b, p)` 区间。
