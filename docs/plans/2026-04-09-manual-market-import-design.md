# Manual Market Import Design

## 目标

在真实 Takealot Seller API 还不能稳定提供竞品最低价之前，先补一条 `manual-import` 市场情报链路，让运营可以手工录入最低竞品价，并继续复用现有建议价与调价闭环。

## 方案选择

我采用“商品内嵌手工市场快照 + 独立 market provider”的做法，而不是再引入一张新表或独立导入文件。原因很直接：

- 当前项目还是本地 JSON 存储，嵌入商品模型最省改动面
- `ProductService` 已经支持 seller / market provider 分离，新增一个只读 market provider 成本低
- 手工最低价本质是单商品、单时间点、低频更新的数据，不值得先做复杂归档

相比“额外 market snapshot 存储层”，这个方案更容易保持 YAGNI；相比“继续只靠 mock”，它又能把真实运营动作往前推进一步。

## 数据与流程

每个商品新增一份可选的手工市场快照，至少包含：

- 最低竞品卖家名
- 最低竞品价格
- 录入时间

当 `marketProvider = manual-import` 时，`manual-import` provider 直接把这份快照转成 `MarketOffer[]` 返回给服务层。服务层仍然通过 `ensureOwnOffer()` 把自己的报价补进去，然后复用现有 `repricing` 规则引擎生成建议价。

录入流程走一个独立 API：

1. 前端提交手工最低竞品卖家名和价格
2. 服务层把快照写回商品记录
3. 同时把该商品 `marketProvider` 切到 `manual-import`
4. 立即刷新预览并返回最新建议价

## 风控边界

- `manual-import` 只负责市场情报，不负责任何卖家写操作
- 没有手工快照时，`manual-import` provider 返回空竞品列表，系统不会伪造数据
- 调价执行仍由 seller provider 决定；如果 seller provider 是 `dry-run`，仍只记审计，不改现价
