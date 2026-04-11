# Integration Plan

## 最新外部信息梳理

基于最新公开资料，当前最有价值的信号有三类：

### 1. 官方卖家入口存在 Seller Portal

官方卖家页明确说明可在 Seller Portal 中管理：

- stock
- pricing
- product selection

这说明“改自己的价格”本身是卖家平台的正式能力。

### 2. 官方条款对自动抓站有明确限制

Takealot 平台条款明确禁止使用：

- robot
- spider
- other automatic device
- manual process

去 monitor、copy、distribute、modify 平台及其内容，搜索引擎例外。

因此，公开站点抓取不适合作为生产主链路。

### 3. 生态里存在 Seller API / API key 的强信号

公开可见的第三方资料多次提到：

- Seller Portal 中存在 `API Integration`
- 卖家可生成 `API key`
- 第三方工具通过 `Takealot Seller API` 集成

同时，Takealot 官方 `Seller Success Network` 里存在 `Apps and Seller Portal Integrations` 类别，说明这类集成路线在生态内是成立的。

## 接入优先级

### 优先级 A：官方 Seller API

目标：

- API key 鉴权
- own product / offer 读取
- own price 更新
- 卖家维度报表 / 库存 / 订单同步

这是主链路。

### 优先级 B：官方认可伙伴或中间层

如果官方 Seller API 不暴露竞品最低价，则市场情报层单独接：

- TSeller 类工具
- Seller Success Network 中的官方目录伙伴
- 你已有的内部数据源

### 优先级 C：人工或半自动导入

当竞品数据无法稳定程序化取得时：

- CSV 导入
- 手工录入最低价
- 周期性人工刷新

当前仓库已经先落地了最小可用版本：

- `manual-import` market provider
- 单商品手工录入最低竞品卖家名与价格
- 录入后立即刷新建议价预览

### 优先级 D：浏览器自动化 fallback

仅在以下条件同时满足时才考虑：

- 合规风险明确接受
- API 无法满足
- 登录态与页面结构可稳定控制
- 有独立失败恢复和审计能力

## 实施前必须确认的问题

- Seller Portal 是否真的可生成 API key
- API key 权限是否可读写 price
- 是否有官方 endpoint 文档
- 是否能读到 Buy Box / competitor / offer-level 数据
- rate limit、错误码、token 生命周期是什么

## 技术建议

- 项目内新增 `takealot-seller-api.ts`
- 项目内新增 `Seller API readiness` 诊断层与 route
- 把当前 `takealot-browser.ts` 标记为 fallback provider
- 市场情报与卖家操作拆成两个接口
- 所有真实写操作先加 dry-run 模式

## 当前仓库状态

- 已拆分 `seller operations` 与 `market intelligence` provider 合同
- `ProductService` 已支持 market provider 与 seller provider 分离
- 已新增 `takealot-seller-api` skeleton，并在 runtime 中按环境变量注册
- 缺少 `TAKEALOT_SELLER_API_KEY` 时会明确报错
- 已新增 `GET /api/integrations/takealot-seller-api/readiness`，用于输出配置状态、guardrail 和后续动作建议
- 鉴权头与写操作流程仍是保守占位实现，不伪装成已确认官方协议
- 浏览器模式保留为 fallback，不再作为默认真实接入路线

当前 readiness 的定位要保持明确：

- 它只报告“是否具备继续接入的前置条件”
- 它不会把占位鉴权头包装成已验证方案
- 它不会把竞品数据能力误报为 Seller API 原生能力
