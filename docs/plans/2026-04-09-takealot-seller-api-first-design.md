# Takealot Seller API First Design

## 设计目标

把项目的真实接入路线从 `browser-first` 调整为 `Seller API-first`，同时保留现有 `mock` 闭环，避免在不稳定、可能不合规的公开站点抓取上继续投入。

## 方案比较

### 方案 A：Seller API First

优点：

- 最接近平台正式能力
- 适合改价、库存、报表这类卖家动作
- 更容易做审计和失败恢复

缺点：

- 文档可能不公开
- 必须先拿到 Seller Portal API key
- 不保证一定提供竞品最低价

### 方案 B：公开网页抓取 + 浏览器自动化

优点：

- 理论上能看到商品页卖家报价

缺点：

- 当前环境已被 Cloudflare challenge 阻断
- 官方条款对自动监控/抓取存在明确限制
- 稳定性和合规性都差

### 方案 C：Seller API + 第三方集成

优点：

- 现实落地性强
- 与 Takealot 生态现状一致

缺点：

- 依赖外部服务
- 数据能力和成本受第三方限制

## 推荐结论

采用 `方案 A + 方案 C`：

- 卖家动作使用 `Seller API`
- 市场情报优先尝试 `Seller API`
- 若 Seller API 不提供竞品最低价，则通过 `approved partner feed` 或 `manual import` 补齐
- 浏览器自动化仅作 fallback，不作主方案

## 对当前仓库的影响

- 保留已有规则引擎和 UI
- 弱化 `takealot-browser` 的战略地位
- 下一阶段新增 `takealot-seller-api` provider
- 业务模型改成“双 provider 分层”

## 验证标准

- 先验证 API key 是否存在
- 再验证是否能读 own offers
- 再验证是否能改价
- 最后再验证是否有竞品/Buy Box 数据
