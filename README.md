# Takealot Repricing Platform

本项目是一个本地运行的 Takealot 调价后台，目标是完成这条闭环：

1. 监控某个商品的竞品最低价
2. 按你的规则计算建议价
3. 触发“改自己的商品价格”
4. 记录每次执行历史

当前仓库已经包含两种接入模式：

- `mock`：可直接演示完整流程，适合先验证规则、页面和 API
- `takealot-browser`：旧的浏览器后备骨架，不再是推荐主路线
- `takealot-seller-api`：Seller API-first 骨架，默认保守为 `dry-run`

当前还新增了三项运营能力：

- `active` SKU 监控开关
- `marketSnapshots` 独立快照历史
- `refresh-active` 批量刷新当前启用监控的商品

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

可通过环境变量覆盖：

```bash
DATA_FILE_PATH=/absolute/path/to/store.json
```

## mock 演示模式

种子商品已经内置，页面首次加载会自动为 `mock` 商品补一次市场价预览。

你可以直接体验：

- 刷新市场价
- 批量刷新 active 商品
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

规则是：

- `BMAD-lite` 管需求、架构、集成路线、里程碑
- `superpowers` 管实际执行纪律

## 真实 Takealot 接入

最新路线已经调整为 `Seller API-first`。

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
- 已接入 `takealot-seller-api` skeleton
- 已支持按商品分别设置 `sellerProvider` 与 `marketProvider`
- 已接入 `manual-import` market provider，可手工录入最低竞品价
- 缺少 `TAKEALOT_SELLER_API_KEY` 时会明确报错
- 真实写操作默认建议保持 `dry-run`
- `dry-run` 执行会落审计记录，但不会改本地持久化现价
- 尚未硬编码任何未确认的官方 endpoint / auth 协议

相关接口与前端能力：

- `PATCH /api/products/:id/providers`：切换单商品的 `sellerProvider` / `marketProvider`
- `PATCH /api/products/:id/settings`：切换单商品的 `active` 监控状态
- `PATCH /api/products/:id/manual-market`：保存手工最低竞品并立即刷新建议价
- `POST /api/products/refresh-active`：批量刷新所有 `active !== false` 的商品
- `GET /api/products`：返回 `products`、`executions`、`marketSnapshots`
- Dashboard 商品卡片可直接保存 provider 绑定
- Dashboard 商品卡片可直接录入“手工最低价”
- Dashboard 顶部可直接批量刷新 active 商品
- Dashboard 商品卡片可直接启停监控，并展示最近 1-3 条市场快照
- 执行历史会把 `dry_run` 明确标成“模拟执行”

`takealot-browser` 目前只是后备骨架，不建议作为主实现。原因很直接：

- `www.takealot.com` 与 `sellers.takealot.com` 在当前环境都会被 Cloudflare challenge 拦截
- 平台条款对自动抓取/监控有风险
- 卖家动作更适合走正式卖家接口

当前更推荐你先验证：

1. Seller Portal 是否有 `API Integration`
2. 是否能生成 API key
3. API 是否支持读 own offers / 写 own price / 读 Buy Box 或竞品数据

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
- 测试覆盖核心闭环
- BMAD-lite 项目治理文档
- Seller API-first 设计与实施计划

## 说明

- 当前批量刷新只是本地手动触发入口，还没有引入 cron / 队列调度。
- 当前工作目录不是 git repo，因此计划文档里的 commit / worktree 步骤在本仓库内不会执行。
