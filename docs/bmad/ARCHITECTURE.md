# Architecture

## 总体结构

系统继续保持单仓库单应用：

- `src/app/*`：界面与 API route
- `src/core/*`：纯业务规则
- `src/lib/*`：存储、服务层、运行时装配
- `src/integrations/*`：外部平台适配器

核心设计原则不变：`业务层不直接依赖 Takealot 接入细节`。

## 提供者分层

需要把外部能力拆成两层，而不是混成一个 provider：

### 1. Seller Operations Provider

负责卖家自己的受控操作：

- 读取 own offers / own catalog
- 更新 own price
- 读取订单、库存、报表等卖家视角数据

目标实现：

- `mock`
- `takealot-seller-api`

### 2. Market Intelligence Provider

负责市场侧信息：

- Buy Box 状态
- 竞品最低价
- 竞品 seller 列表
- 外部观测数据

目标实现：

- `mock`
- `seller-api` 如果官方能力覆盖
- `partner-feed` 如果通过认可集成拿到
- `manual-import` 如果只能人工补充
- `browser-fallback` 只在合规确认后使用

## 服务层职责

`ProductService` 后续应拆成：

- `PricingRuleService`
- `MarketRefreshService`
- `PriceExecutionService`
- `AuditService`

这样做的原因是：卖家 API 调价和市场情报刷新并不总是来自同一个数据源。

当前这版还保留单一 `ProductService` 作为编排层，但已经补了三类明确职责：

- 单商品刷新与手工市场导入都会落独立 `marketSnapshots`
- `active` 监控状态只影响批量刷新入口，不阻断手工刷新或手工调价
- `refreshActiveProducts()` 作为后续 cron / scheduler 的稳定服务接口

## 数据模型建议

商品记录至少分四部分：

- `product`
- `rule`
- `marketSnapshot`
- `executionHistory`

当前实际存储已经对应为：

- `products[]`
- `executions[]`
- `marketSnapshots[]`

其中 `marketSnapshot` 不能假设一定有完整竞品列表，应该支持：

- `lowestCompetitorPrice`
- `buyBoxWinner`
- `source`
- `confidence`
- `capturedAt`

当前已落地的 `marketSnapshots` 最小字段为：

- `id`
- `productId`
- `productTitle`
- `marketProvider`
- `offers`
- `preview`
- `capturedAt`
- `source`

并且刷新 / 手工导入都按倒序写入历史，供 Dashboard 展示最近快照摘要。

## 风控边界

- 没有可信市场快照时，不自动执行调价
- 没有 API 写权限时，不展示“自动执行已接通”
- 任何自动调价都必须保留前值、建议值、原因、来源和执行时间
- 当前 `active` 批量刷新仍是人工触发，不表示已经接入后台定时任务
