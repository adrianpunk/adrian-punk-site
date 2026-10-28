# Adrian.Punk — Portfolio

个人网站，极简黑白 + 橙色点缀。首页镜头钻进相机头人物的镜头里，落进一条暗色长廊：镜面黑地板、几道白色光线，01–04 号门左右交替、门缝透出橙光；尽头的墙上，一台投影仪把联系方式投在墙上（账号可点、微信二维码可直接扫）。点一扇门就走进去：About 是俯视的人生路线，四段经历平铺在路边，点开看照片；Tools 是米白 + 雾蓝的极简生产线，点机器直接打开工具。这两处不再跳页面，滚动或滑动在里面移动，Esc 或左上角按钮回到走廊。Writing（作品隧道）和 Parlour（橙灯下的双人桌）看完后进入各自的单独页面，底部可以回到走廊或走向下一站。

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
