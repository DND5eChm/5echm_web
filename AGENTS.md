# WebHelp 模板仓库开发指引

## 适用范围

- 本文件适用于本仓库全部文件。
- 子目录若新增 `AGENTS.md` 或 `AGENTS.override.md`，以更接近目标文件的规则为准。
- 本仓库只维护 WebHelp 模板及其本地资源；正文、编译器和生产搜索页分别属于其他仓库。

## 四仓库关系与生成链路

- 本仓库 `/mnt/f/TRPG-CHM/5echm_web_templates-dev`：WebHelp HTML、CSS、JavaScript 模板，是网页 UI 的首选修改位置。
- `/mnt/e/Code/Python/5echm_web_build`：`wcp2web` 编译器，负责解析 WCP、替换模板变量、生成导航/索引/搜索数据、转换正文并输出构建报告。仅在模板无法表达需求时做最小修改。
- `/mnt/f/TRPG-CHM/5echmweb_search`：生产全文搜索页及搜索服务。生产构建使用该仓库的 `webhelpsearch.htm` 覆盖本仓库同名回退页。
- `/mnt/f/TRPG-CHM/DND5e_chm`：真实 WCP 工程和正文源，主要用于全量构建验证；不要为 Web UI 批量修改正文。

真实链路为：

```text
DND5e_chm/不全书.wcp + 正文源
  -> 5echm_web_build/wcp2web
  -> 本仓库 WebHelp 模板
  -> 静态站点 + 搜索索引 + 构建报告
```

生产配置和发布步骤以 `DND5e_chm/.github/workflows/build-web.yml` 为准。该 workflow 通过 `[webhelp].search_template` 指向 `5echmweb_search/webhelpsearch.htm`；本仓库 `webhelpsearch.htm` 仅用于未配置生产搜索模板时的本地 `data.js` 回退。

WebHelp 与 CHM 必须保持分离：现代 Shell 面向现代浏览器，不得要求 CHM/MSHTML 使用本仓库的现代 CSS/JS，也不得为适配网页而改写 CHM 正文源。

## 仓库结构

- `index.htm`：现代 HTML5 Shell；顶部工具栏、响应式侧栏、单个 `name="content"` 正文 iframe、URL/history 和用户状态入口。
- `indexh.htm`、`webhelpframe.htm`、`webhelpleft*.htm`、`webhelptop*.htm`、`webhelptoolbar.htm`：旧入口和简易模式的兼容层。修改时仍需保持可独立加载。
- `webhelpcontents.htm`：目录容器和 `($NAVIGATION$)` 注入点。
- `webhelpindex.htm`、`webhelpbookmark.htm`：索引和本地书签视图。
- `webhelpsearch.htm`：本地搜索回退，不是生产搜索页的唯一来源。
- `assets/webhelp-shell.{css,js}`：应用壳、Drawer、主题、字号、打印、搜索入口、导航和 iframe 协调。
- `assets/webhelp-contents.js`、`assets/webhelp-nav.css`：生成目录树的兼容 API、过滤、选择、展开/收起和导航视图样式。
- `assets/webhelp-topic.css`：由 Shell 注入同源 topic iframe 的正文适配样式。
- `assets/webhelp-compat.css`、`assets/webhelp-frame.js`：兼容入口样式和行为。
- `assets/webhelp-index.js`、`assets/webhelp-bookmarks.js`、`assets/webhelp-local-search.js`：索引、书签和本地搜索逻辑。
- `style.css`：保留给旧正文/模板的兼容入口；新的 Shell 样式不要继续堆入旧类名体系。

## 模板与生成器契约

- 必须保留并实际验证这些占位符：`($PROJECTTITLE$)`、`($DEFAULTPAGE$)`、`($NAVWIDTH$)`、`($BACKCOLOR$)`、`($FONTCOLOR$)`、`($NAVIGATION$)`、`($INDEXLIST$)`、`($SETLANGUAGE$)`。
- 不要因现代布局暂时未使用某个值就删除占位符；先确认 `wcp2web`、WinCHM 模板处理和兼容入口均不依赖它。
- `($NAVIGATION$)` 仍是目录数据源。不要在前端另造一套目录数据，也不要要求批量修改 topic 链接。
- 生成目录仍会调用或暴露 `show()`、`collapse()`、`collapseAll()`、`showAll()`、`clickNode()`、`selectNode()`、`LinkClick()` 等兼容函数。改变其签名或全局可见性前，必须检查生成 HTML。
- 不直接手工修改 `wcp2web` 的站点输出或 `DND5e_chm` 的成千上万篇 topic；统一行为应通过模板、共享样式、编译器注入或 Shell 增强实现。

## 前端架构与实现约束

- 保持纯静态 HTML5、CSS 和 Vanilla JavaScript；资源使用本地 SVG/CSS，不增加框架、CDN、在线字体、npm runtime 或运行时网络依赖。
- Shell 保持“侧栏 + 单正文 iframe”结构以及稳定的 `name="content"`，不要恢复多层 frameset。旧 `target="content"` 链接必须继续工作。
- Shell、导航 iframe 和 topic iframe 的样式必须分域：壳样式放 `webhelp-shell.css`，导航放 `webhelp-nav.css`，正文适配放 `webhelp-topic.css`，避免选择器跨域污染。
- 主题和字号由 Shell 写入 iframe 根元素；topic CSS 由 `webhelp-shell.js` 在同源加载后注入。`file://` 失败、跨域访问和 localStorage 禁用都必须有 `try/catch` 降级，核心阅读与导航不能因此失效。
- 搜索结果到正文的高亮通信依赖 `wcp2web` 生成的 `webhelp-content-bridge.js` 和 `postMessage`；不要在模板仓库复制另一套搜索协议。
- 正文宽表格只包装最外层 table，使用横向滚动容器；不要包装嵌套 table，也不要压缩列宽破坏数据表。
- 用户状态键统一使用 `5echm.webhelp.` 前缀。新增持久状态时继续通过封装后的安全读写函数访问 localStorage。

## 已验证的旧正文兼容规则

- 不要用全局 reset 清零旧正文的 `p`、`h6` 等上下边距。怪物数据块和物品分类依赖原有排版关系，粗暴重置会产生异常下划线或内容重叠。
- `div.center` 等旧容器必须保留 `box-sizing: border-box`、`width: auto`、`max-width: 100%` 和受控内边距，避免移动端或窄 iframe 出现越界格子。
- 不改正文原始 table、font、inline style 来“修复”单页视觉；优先在 `webhelp-topic.css` 添加范围明确的兼容规则，并用真实页面回归。
- 全部收起目录时必须遍历实际 DOM 中的 `div[id^="d"]` 分支。生成器的 `divlist` 不一定包含所有真实分支，不能作为唯一数据源。
- 同一 topic URL 可能在目录中出现多次。选择同步必须优先保留用户实际点击的节点 ID，不能仅按 URL 找到第一个节点，否则后面的同名目录项无法保持选中。
- “展开”只展开当前选中节点的下一级；“全部收起”收起所有目录分支。不要把二者实现为含义模糊的全量切换。
- 目录过滤清空后必须恢复过滤前的展开快照；`Esc` 先清空过滤，再关闭移动 Drawer。
- 搜索提示只在输入框获得焦点时显示：侧栏搜索页内提示占据正常文档流，不遮挡筛选项；顶部搜索框提示使用独立下悬层，不挤压顶部栏。

## 跨仓库修改边界

- 默认先在本仓库实现 UI 和兼容层。只有现有模板无法生成所需结构、必须新增极少量变量或统一注入资源时，才修改 `5echm_web_build`。
- 修改生产搜索 UI 时，必须同步检查 `/mnt/f/TRPG-CHM/5echmweb_search/webhelpsearch.htm`；不要只改本仓库回退页。除非需求明确，不改变搜索 API、`contents` 三元组或索引格式。
- `DND5e_chm` 仅作为真实构建输入和 CI 配置来源。不要修改正文内容；确需改工程配置时保持最小且先确认不会影响 CHM。
- 开始跨仓库工作前分别检查 `git status`，保留所有已有未提交修改。不要执行清理、回滚、提交或发布操作。

## 构建与验证

本仓库没有 npm 构建步骤。模板修改后至少执行：

```bash
for file in assets/*.js; do node --check "$file"; done
git diff --check
```

修改目录兼容行为时，还应在真实生成的 `webhelpcontents.htm` 上检查：目录展开/收起、过滤快照、当前节点、重复 URL 节点及上一项/下一项。仅用手写小树不能替代真实目录验证。

编译器测试在 `/mnt/e/Code/Python/5echm_web_build` 执行：

```bash
python -m pytest -q
```

真实构建前，从 `DND5e_chm/.github/workflows/build-web.yml` 复制当前 `[project]`、`[output]`、`[webhelp]`、`[encoding]` 和 `[build]` 配置到本地 TOML；不要猜测路径或复用一次性的 `/tmp` 配置。未安装 CLI 时在编译器仓库执行：

```bash
PYTHONPATH=src python -m wcp2web build --config /absolute/path/to/wcp2web.toml
PYTHONPATH=src python -m wcp2web validate --config /absolute/path/to/wcp2web.toml
```

构建后至少确认：

- `index.htm`/`index.html`、默认 topic、目录、索引、书签和生产搜索页存在且无未解析占位符；
- 搜索页使用配置的生产 API，搜索结果能在 `content` iframe 打开并高亮；
- `?page=...`、刷新、后退/前进和重复 URL 目录项保持正确；
- 375、390、430、768、1024、1280、1440、1920px 下无整页横向溢出，手机使用 Drawer；
- 宽表格可独立横向滚动、图片不突破正文、主题/字号/打印正常；
- localStorage 不可用时不发生致命错误；
- `build-report.json`、`encoding-report.json`、`missing-files.json` 和 `broken-links.json` 已审阅。正文仓库存在历史断链时，应与基线比较并追踪到本次改动，不能仅凭断链总数判定模板回归。

生产搜索页、完整响应式布局和视觉细节需要真实浏览器人工检查；未运行的检查必须在交付说明中明确列出。
