// All page copy lives here. Content comes from the adrian-punk-portfolio repo.
// To add a session (X post): put a cover in public/sessions/ and add a row at the top of `sessions`.

// The doors down the corridor, in order; each opens one section of the page.
export const doors = [
  { no: '01', name: 'About', zh: '关于我', section: 'notes' },
  { no: '02', name: 'Tools', zh: '工具', section: 'tools' },
  { no: '03', name: 'Writing', zh: '写在 X 上', section: 'sessions' },
  { no: '04', name: 'Parlour', zh: '约我聊聊', section: 'parlour' },
  { no: '05', name: 'Contact', zh: '联系我', section: 'contact' },
];

export const credits = [
  { no: '01', photo: 'img/about/growth.jpg', title: '用户增长', role: '线上教育大厂 · 用户增长负责人', en: 'Online education · User growth leader', story: '把模糊的用户需求转化为清晰的增长路径，在产品、内容与运营之间建立可以持续复用的增长方法。', tags: ['User Growth', 'Education', 'Strategy'] },
  { no: '02', photo: 'img/about/vaccine.jpg', title: '生命科学', role: '疫苗大厂 · 研发质量管理', en: 'Vaccine R&D · Quality management', story: '在复杂流程中识别风险、建立标准，并让每一个判断都可以被验证。', tags: ['Biotech', 'R&D', 'Quality'] },
  { no: '03', photo: 'img/about/ustc.jpg', title: '管理科学', role: '中国科学技术大学 · 管理科学硕士', en: 'USTC · Master of Management Science', story: '把经验拆解成问题、变量与系统——这成了我面对产品、组织与 AI 时的底层思考方式。', tags: ['USTC', 'Models', 'Systems'] },
  { no: '04', photo: 'img/avatar.jpg', title: 'AI 视觉创作', role: 'AI 视觉创作者 · X 内容创作者', en: 'AI visual creator · X creator', story: '持续研究生成式视觉、提示词与创作工作流，在 X 上分享实验与教程，让技术成为个人表达。', tags: ['Generative AI', 'Visual', 'X Creator'] },
  { no: '05', photo: 'img/about/talk.jpg', title: 'FDE & AI 培训', role: 'FDE · AI 企业培训', en: 'FDE · Enterprise AI training', story: '连接 AI 技术与业务场景，把工具、工作流与实践方法带进团队，让学习转化为实际应用。', tags: ['FDE', 'AI Training', 'Workflows'] },
];

export const tools = [
  { code: 'AP-01', short: '封面 · 头像 · 统一视觉', title: 'Punk Skill', role: 'Visual generation suite', copy: '面向 AI Agent 的视觉生成 Skill 集合，用来制作封面、头像，并稳定统一的个人视觉风格。', scenes: ['文章与产品封面', '个人头像与视觉身份', '系列内容统一风格'], demo: '主题 + 人物素材 → 封面、头像与成套视觉资产', href: 'https://github.com/adrianpunk/Punk-Skill' },
  { code: 'AP-02', short: '一张照片，一个会讲故事的 IP', title: 'IP Illustrations', role: 'Personal IP module', copy: '从一张照片建立可复用的个人 IP，让同一个角色持续进入文章插图和不同叙事场景。', scenes: ['长文配图', '教程场景插画', '个人 IP 连续叙事'], demo: '一张人物照片 → 角色设定 → 一致的场景插画', href: 'https://github.com/adrianpunk/punk-ip-illustrations' },
  { code: 'AP-03', short: 'Markdown 变小红书卡片', title: 'XHS Cards', role: 'Knowledge card module', copy: '把个人 IP 与 Markdown 教程转换成自适应的小红书知识卡片，兼顾信息层级与发布效果。', scenes: ['小红书教程', '知识型图文', '个人 IP 内容系列'], demo: 'Markdown 教程 → 带个人 IP 的多页知识卡片', href: 'https://github.com/adrianpunk/punk-xhs-cards' },
  { code: 'AP-M', short: 'Markdown 一键公众号排版', title: '微排 Weipai', role: 'WeChat layout tool', copy: '把 Markdown 稿件整理成层级清楚、适合阅读和发布的微信公众号图文，减少手动排版。', scenes: ['公众号长文', '教程与复盘', '品牌内容排版'], demo: 'Markdown → 自动排版 → 微信预览 → 发布', href: 'https://weipai.iamadrianpunk.com/' },
];

export const sessions = [
  {"cover": "sessions/2098366626571989034.webp", "title": "一套提示词，轻松拿捏科技大厂风", "meta": "设计提示词 · 视觉创作", "category": "design", "href": "https://x.com/AdrianPunk115/status/2098366626571989034"},
  {"cover": "sessions/2098055380857143807.webp", "title": "Image2.5 玩法全公开，从个人到电商（附提示词教程）", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2098055380857143807"},
  {"cover": "sessions/2097673648727585074.webp", "title": "GPT-Image 2.5 实测：普通人最容易上手，效果最好的生图模型", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2097673648727585074"},
  {"cover": "sessions/2097311704547987756.webp", "title": "用Grok Bot搭建自媒体团队：保姆级教程", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2097311704547987756"},
  {"cover": "sessions/2096933821061190098.webp", "title": "Hermes+微信，实现远程操控：小白保姆级教程", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2096933821061190098"},
  {"cover": "sessions/2096577625074680225.webp", "title": "Dan Koe提示词风格：黑白蚀刻版画✖️超现实隐喻", "meta": "设计提示词 · 视觉创作", "category": "design", "href": "https://x.com/AdrianPunk115/status/2096577625074680225"},
  {"cover": "sessions/2096202974653722823.webp", "title": "AI网站前端设计工作流：小白保姆级教程", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2096202974653722823"},
  {"cover": "sessions/2095791816750596304.webp", "title": "40 种适合杂志、海报与 AI 生图的英文字体图鉴（附提示词）——下册", "meta": "设计提示词 · 视觉创作", "category": "design", "href": "https://x.com/AdrianPunk115/status/2095791816750596304"},
  {"cover": "sessions/2095455845823971411.webp", "title": "40 种适合杂志、海报与 AI 生图的英文字体图鉴（附提示词）——上册", "meta": "设计提示词 · 视觉创作", "category": "design", "href": "https://x.com/AdrianPunk115/status/2095455845823971411"},
  {"cover": "sessions/2095082810172473824.webp", "title": "把“印刷触感”做进图片里：一套击凸 × 压凹质感提示词", "meta": "设计提示词 · 视觉创作", "category": "design", "href": "https://x.com/AdrianPunk115/status/2095082810172473824"},
  {"cover": "sessions/2094009581651534062.webp", "title": "小白AI入门必学的：66 个 AI 高频词（人话版）", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2094009581651534062"},
  {"cover": "sessions/2093596524093820965.webp", "title": "一套提示词，生成这种图文穿插海报", "meta": "设计提示词 · 视觉创作", "category": "design", "href": "https://x.com/AdrianPunk115/status/2093596524093820965"},
  {"cover": "sessions/2093331445486116896.webp", "title": "千问 Qwen3.8 27B 本地化部署：小白保姆级教程", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2093331445486116896"},
  {"cover": "sessions/2092847810261725478.webp", "title": "AI 做海报、HTML 构图手册：16 种控制网格、图文关系与信息密度的海报构图——下册", "meta": "设计提示词 · 视觉创作", "category": "design", "href": "https://x.com/AdrianPunk115/status/2092847810261725478"},
  {"cover": "sessions/2092410274682954143.webp", "title": "万字长文｜豆包工作从 0 到 1：一份小白也能直接上手的 Agent 教程", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2092410274682954143"},
  {"cover": "sessions/2092176129083982108.webp", "title": "AI 做海报、HTML构图手册：16 种控制焦点与动势的海报构图——上册（附样图和提示词）", "meta": "设计提示词 · 视觉创作", "category": "design", "href": "https://x.com/AdrianPunk115/status/2092176129083982108"},
  {"cover": "sessions/2091778148514107628.webp", "title": "一台 MacBook 连接 Linux、Mac mini 和 Windows：Tailscale 从 0 到 1 小白教程", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2091778148514107628"},
  {"cover": "sessions/2091466085468156128.webp", "title": "把现成 Skill 直接变成可上传 REDSkill：Punk REDSkill Forge 使用教程", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2091466085468156128"},
  {"cover": "sessions/2091050983673692645.webp", "title": "把 Grok 4.6 装进 Codex：OAuth 安装教程，以及我踩过的 5 个坑", "meta": "小白教程 · AI 实用指南", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2091050983673692645"},
  {"cover": "sessions/2089254250547437707.webp", "title": "WorkBuddy + ima 进阶篇：现在它能直接写你的知识库了", "meta": "小白教程 · 知识库工作流", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2089254250547437707"},
  {"cover": "sessions/2088543211656753278.webp", "title": "我做了一个公众号排版工具：Markdown 写完，一键复制到公众号", "meta": "小白教程 · 公众号排版", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2088543211656753278"},
  {"cover": "sessions/2087842954044149974.webp", "title": "我的封面是怎么做的？答案是这个 500+ Star 的 Skill", "meta": "小白教程 · 封面创作工具", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2087842954044149974"},
  {"cover": "sessions/2087494970341257385.webp", "title": "不想重新排版，我把长文转小红书做成了 Skill", "meta": "小白教程 · 内容转排工作流", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2087494970341257385"},
  {"cover": "sessions/2087046395949973788.webp", "title": "Obsidian 别只装完就吃灰，我把从 0 到 1 搭知识库的步骤写清楚了", "meta": "小白教程 · Obsidian 知识库", "category": "tutorial", "href": "https://x.com/AdrianPunk115/status/2087046395949973788"}
];

export const parlour = [
  { no: '01', name: 'Online Session', zh: '一对一线上咨询', price: 500, topics: ['X 内容与账号增长', 'AI 图片生成 · 提示词与工作流', 'AI 小白入门 · 从零开始的教程'] },
  { no: '02', name: 'Coffee Chat', zh: '面对面，喝杯咖啡', price: 199, topics: ['带上你的问题与好奇心', '时间、地点通过微信预约确认'] },
];

export const links = [
  { label: 'X', handle: '@AdrianPunk115', href: 'https://x.com/AdrianPunk115' },
  { label: '抖音', handle: 'Adrian_Punk0115', href: 'https://v.douyin.com/b_VyjTmOplc/' },
  { label: '小红书', handle: '@Adrian.Punk', href: 'https://xhslink.cn/o/1jTteLh1VHg' },
  { label: 'GitHub', handle: 'adrianpunk', href: 'https://github.com/adrianpunk' },
];
