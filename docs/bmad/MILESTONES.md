# Milestones

## Phase 0: Discovery

目标：确认 Seller API 是否真实可用

- 登录 Seller Portal
- 找到 `API Integration`
- 生成 API key
- 记录鉴权方式、权限范围、已知 endpoint
- 确认是否能读取竞品或 Buy Box 数据

完成标准：

- 至少拿到一份可复用的 API 接入证据

## Phase 1: Seller API Provider

目标：接通卖家操作主链路

- 新增 `takealot-seller-api` provider
- 接通 own products / own offers
- 接通 price update
- 加入 dry-run 和审计

完成标准：

- 单 SKU 可以通过真实 API 执行一次调价

## Phase 2: Market Intelligence

目标：解决“最低价来源”问题

优先顺序：

- Seller API
- approved partner feed
- manual import
- browser fallback

完成标准：

- 系统能给出可信来源的市场快照

## Phase 3: Automation Controls

目标：让 repricing 可安全自动化

- 自动执行窗口
- 价格变化阈值
- 最低利润保护
- 告警与回滚

完成标准：

- 调价过程可控、可停、可追溯

## Phase 4: Hardening

目标：进入稳定运营

- 用户认证
- 数据库替换 JSON
- 定时任务
- 错误重试
- 操作日志和权限控制

完成标准：

- 适合长期运行，不依赖手工看护
