# Takealot Repricing Platform

本项目是一个本地运行的 Takealot 调价后台，目标是完成这条闭环：

1. 监控某个商品的竞品最低价
2. 按你的规则计算建议价
3. 触发“改自己的商品价格”
4. 记录每次执行历史

当前仓库已经包含两种接入模式：

- `mock`：可直接演示完整流程，适合先验证规则、页面和 API
- `takealot-browser`：旧的浏览器后备骨架，不再是推荐主路线
- `takealot-seller-api`：按官方 Marketplace API v1 默认协议收敛的卖家侧接入，默认保守为 `dry-run`

当前还新增了三项运营能力：

- `active` SKU 监控开关
- `marketSnapshots` 独立快照历史
- `refresh-active` 批量刷新当前启用监控的商品
- `own listing sync` 卖家侧商品数据同步
- `sync-own-listings-active` 批量同步当前启用监控商品的卖家侧数据
- `sync-seller-catalog` 从 Marketplace API 同步店铺商品列表
- `seller-offer table` 用表格查看 seller catalog 商品并执行竞价动作

## 启动

```bash
pnpm install
pnpm dev
```

默认访问：`http://localhost:3000`

## 验证

```bash
pnpm test
pnpm lint
pnpm build
```

## 目录说明

- `src/core/*`：定价规则引擎
- `src/lib/*`：本地 JSON 存储、种子数据、服务层、运行时装配
- `src/integrations/*`：市场适配器
- `src/app/api/*`：产品列表、刷新、改规则、切换 provider、执行调价 API
- `src/components/*`：运营后台 UI
- `docs/bmad/*`：BMAD-lite 项目治理文档

## 数据存储

默认存储文件：

```text
data/store.json
```

Seller API 图形化设置默认单独持久化到：

```text
data/takealot-seller-api-settings.json
```

可通过环境变量覆盖：

```bash
DATA_FILE_PATH=/absolute/path/to/store.json
TAKEALOT_SELLER_API_SETTINGS_FILE_PATH=/absolute/path/to/takealot-seller-api-settings.json
TAKEALOT_PROFILE_DIR=/absolute/path/to/takealot-browser-profile
```

## mock 演示模式

种子商品已经内置，页面首次加载会自动为 `mock` 商品补一次市场价预览。

你可以直接体验：

- 同步卖家数据
- 刷新市场价
- 批量刷新 active 商品
- 批量同步 active 卖家数据
- 启用 / 停用某个 SKU 的监控
- 修改规则
- 执行调价
- 查看最近市场快照
- 查看执行历史

## 项目治理

当前仓库已经补了一套 `BMAD-lite + superpowers` 框架，入口在：

- `docs/bmad/README.md`
- `docs/bmad/PRD.md`
- `docs/bmad/ARCHITECTURE.md`
- `docs/bmad/INTEGRATION-PLAN.md`
- `docs/bmad/MILESTONES.md`
- `docs/architecture/2026-04-11-marketplace-api-repricing-architecture.md`

规则是：

- `BMAD-lite` 管需求、架构、集成路线、里程碑
- `superpowers` 管实际执行纪律

## 真实 Takealot 接入

最新路线已经调整为 `Marketplace API-first`。

说明：

- 当前模块名仍保留为 `takealot-seller-api`，避免一次性大范围重命名
- 这里指向的是 Takealot Marketplace API 文档：`https://marketplace-api.takealot.com/v1/docs`

原因：

- 官方卖家页明确说明可在 Seller Portal 里管理 `stock / pricing / product selection`
- 公开条款对自动监控/抓取平台内容有明显限制
- 生态里存在 Seller Portal Integration 与 Seller API key 的强信号

因此当前优先顺序是：

1. `takealot-seller-api`
2. `approved partner feed`
3. `manual import`
4. `takealot-browser fallback`

当前代码层面的状态是：

- 已拆分 `seller operations` 与 `market intelligence` provider 合同
- 已接入 `takealot-seller-api`，默认对齐官方 Marketplace API v1
- 已支持按商品分别设置 `sellerProvider` 与 `marketProvider`
- 已接入 `manual-import` market provider，可手工录入最低竞品价
- 缺少 `TAKEALOT_SELLER_API_KEY` 时会明确报错
- 默认 own offer 读取已按官方 `GET /offers/by_sku/{sku}` 接线
- 默认 live 改价已按官方 `PATCH /offers/by_sku/{sku}` 接线，但仍建议先保持 `dry-run`
- 已支持 `GET /offers` 同步店铺商品列表到本地
- 默认鉴权头已对齐官方 `X-API-Key`
- 已支持通过 env 或 GUI 覆盖 base URL、header 和字段映射
- 真实写操作默认建议保持 `dry-run`
- `dry-run` 执行会落审计记录，但不会改本地持久化现价
- 市场竞品最低价、搜索列表、Buy Box 仍不属于这套官方 API 已确认能力
- `takealot-browser` 现在只负责前台商品页竞价抓取，不负责卖家侧写操作

相关接口与前端能力：

- `PATCH /api/products/:id/providers`：切换单商品的 `sellerProvider` / `marketProvider`
- `PATCH /api/products/:id/settings`：切换单商品的 `active` 监控状态
- `PATCH /api/products/:id/manual-market`：保存手工最低竞品并立即刷新建议价
- `POST /api/products/refresh-active`：批量刷新所有 `active !== false` 的商品
- `POST /api/products/sync-seller-catalog`：从 Marketplace API 同步店铺商品到本地 products
- `POST /api/products/:id/sync-own-listing`：同步单商品的卖家侧 listing 数据
- `POST /api/products/sync-own-listings-active`：批量同步所有 `active !== false` 商品的卖家侧 listing 数据
- `GET /api/products`：返回 `products`、`executions`、`marketSnapshots`
- `GET /api/integrations/takealot-seller-api/readiness`：返回 Seller API 配置与安全缺口诊断
- `GET /api/integrations/takealot-seller-api/settings`：返回 Seller API 图形化设置摘要与 readiness
- `PATCH /api/integrations/takealot-seller-api/settings`：保存本地 Seller API 图形化设置并立即刷新 runtime
- Dashboard 商品卡片可直接保存 provider 绑定
- Dashboard 商品卡片可直接同步卖家侧数据并显示 `SKU / 库存 / listing 状态`
- Dashboard 商品卡片可直接录入“手工最低价”
- Dashboard 顶部现已提供 `店铺商品列表` 表格区，可直接同步店铺商品
- Dashboard 顶部可直接批量刷新 active 商品
- Dashboard 顶部可直接批量同步 active 商品的卖家侧数据
- Dashboard 顶部现已提供 `Seller API 接入设置` 面板
- Dashboard 商品卡片可直接启停监控，并展示最近 1-3 条市场快照
- 执行历史会把 `dry_run` 明确标成“模拟执行”

`takealot-browser` 目前只是后备骨架，不建议作为主实现。原因很直接：

- `www.takealot.com` 与 `sellers.takealot.com` 在当前环境都会被 Cloudflare challenge 拦截
- 平台条款对自动抓取/监控有风险
- 卖家动作更适合走正式卖家接口

当前它的新职责是：

- 只在你显式点击“刷新市场价”或批量刷新时，打开前台商品页抓取 `Best Price / Other Offers`
- 依赖持久化浏览器 profile，因此你需要准备 `TAKEALOT_PROFILE_DIR`
- 这条链路与官方 Marketplace API 分离，不能混为一谈

当前更推荐你先验证：

1. Seller Portal 是否有 `API Integration`
2. 是否能生成 API key
3. API 是否支持读 own offers / 写 own price / 读 Buy Box 或竞品数据

当前代码里还新增了一个 `Seller API readiness` 诊断层，用来明确告诉你：

- 是否已经配置 `TAKEALOT_SELLER_API_KEY`
- 当前是否使用官方默认 `baseUrl`
- 当前是否仍保持 `dry-run`
- 是否已经具备 own offer 读取条件
- 为什么 live 改价仍建议先从单 SKU 验证开始

这个 readiness 只做保守诊断，不代表官方协议已经确认，也不会自动放开真实读写。

现在不必再手改 `.env` 才能验证 own-listing 读取链路。Dashboard 顶部的 `Seller API 接入设置` 面板会把配置写入本地 JSON 文件，并在保存后立即重置 runtime：

- API key 只显示是否已配置和 masked preview，不会把旧 key 明文回填到页面
- API key 输入框是替换模式，留空表示保持当前 key
- GUI 默认会展示官方 Marketplace API 的 base URL、`X-API-Key` 和 `/offers/by_sku/{sellerSku}`
- GUI 设置优先于 `process.env`，便于本地运营同学直接切换 base URL、header、path template 和 `dry-run`
- 如果真实响应字段名和当前默认猜测不同，可以直接在 GUI 里配置 own-listing 字段路径映射

当前最小可用配置只需要：

```bash
TAKEALOT_SELLER_API_KEY=...
TAKEALOT_PROFILE_DIR=/absolute/path/to/takealot-browser-profile
```

说明：

- 默认会使用：
- `baseUrl = https://marketplace-api.takealot.com/v1`
- `authHeaderName = X-API-Key`
- `ownListingPathTemplate = /offers/by_sku/{sellerSku}`
- 同步店铺商品时会自动调用 `GET /offers`
- 生成前台商品链接时会优先使用 `title + productline_id(PLID)`
- `TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE` 支持用商品字段占位；当前默认是 `{sellerSku}`，缺失时会 fallback 到 `product.id`
- `*_PATH` 映射字段都是可选的；只有当官方响应字段名偏离当前内置常见字段时才需要填写
- 当前支持配置 `sellerName / currentPrice / currency / capturedAt / sellerSku / stockQuantity / listingStatus` 这 7 个 own-listing 字段路径
- provider 会优先尝试把返回 JSON 规范化为 `sellerName / currentPrice / currency / sellerSku / stockQuantity / listingStatus / capturedAt`
- 官方 offer payload 当前已优先支持 `selling_price / updated_at / seller_warehouse_stock[].quantity_available`
- 如果官方真实响应字段和当前常见字段映射不一致，需要继续补字段映射规则，而不是硬改成猜测版协议
- 这条链路只针对卖家侧 own listing 读取，不包含竞品最低价、Buy Box 或 market intelligence
- 真实写价仍然单独受 `dry-run` 保护，不会因为读链路打开就自动放开

竞价抓取说明：

- 前台最低价现在走 `takealot-browser` provider
- 当前只在显式刷新时抓取，不会在页面加载时自动全量抓
- 这样列表页可以先秒开，再按你需要逐行或批量刷新竞价数据

当前还新增了 `own listing sync`：

- 它只同步你自己卖家侧的 listing 数据
- 当前关注字段是 `sellerSku / currentPrice / stockQuantity / listingStatus / capturedAt`
- 它不等于竞品最低价采集
- 它不代表 Seller API 已经提供市场情报接口
- 批量版本同样只处理 `active !== false` 的商品
- 它不会生成 `marketSnapshots`，避免和市场侧最低价快照混淆

## 当前已实现

- 本地后台页面
- 商品卡片和规则编辑
- 纯函数定价引擎
- JSON 存储
- mock 市场适配器
- 产品 API
- 执行记录
- active 监控开关
- 市场快照历史
- active 商品批量刷新
- own listing sync
- active 商品批量 own listing sync
- 测试覆盖核心闭环
- BMAD-lite 项目治理文档
- Seller API-first 设计与实施计划

## 说明

- 当前批量刷新只是本地手动触发入口，还没有引入 cron / 队列调度。
- 当前本地目录已经接入 `Cat-Man/takealot-erp` 仓库；本轮实现是在隔离 worktree 中完成的。
