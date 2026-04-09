# BMAD-lite + Superpowers

这套框架专门服务当前仓库，不是通用空模板。

## 分层原则

- `BMAD-lite` 负责项目治理：需求、架构、集成路线、里程碑
- `superpowers skills` 负责执行纪律：brainstorming、writing-plans、TDD、verification
- `代码实现` 只接受已经过上面两层收敛的需求，不直接从模糊想法跳进编码

## 当前项目约束

- 目标平台：Takealot
- 当前可运行模式：`mock`
- 最新主路线：`Seller API-first`
- 浏览器自动化：只作为后备或人工辅助，不再作为主方案

## 文档入口

- [PRD](./PRD.md)
- [Architecture](./ARCHITECTURE.md)
- [Integration Plan](./INTEGRATION-PLAN.md)
- [Milestones](./MILESTONES.md)
- [Seller API First Design](../plans/2026-04-09-takealot-seller-api-first-design.md)
- [Seller API First Implementation Plan](../plans/2026-04-09-takealot-seller-api-first-implementation.md)

## 工作流

1. 先更新 `PRD`
2. 再更新 `ARCHITECTURE`
3. 涉及外部平台接入时，先更新 `INTEGRATION-PLAN`
4. 用 `MILESTONES` 决定当前迭代范围
5. 进入具体开发前，按 `superpowers:writing-plans` 产出新的实现计划
6. 实施时遵守 `superpowers:test-driven-development`
7. 结束前遵守 `superpowers:verification-before-completion`

## 适用边界

适合：

- Seller API 接入
- repricing 规则扩展
- 调价审计和风控
- 后台运营功能迭代

不适合：

- 为了“完整方法论”而生成大量与当前项目无关的角色文档
- 覆盖当前环境里更高优先级的执行规则
