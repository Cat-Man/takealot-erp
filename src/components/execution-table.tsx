import type { PriceExecution } from "@/core/types";

type ExecutionTableProps = {
  executions: PriceExecution[];
};

function formatMoney(value?: number) {
  return typeof value === "number" ? `R${value}` : "未执行";
}

function formatStatus(status: PriceExecution["status"]) {
  if (status === "dry_run") {
    return "dry_run (模拟执行)";
  }

  return status;
}

export function ExecutionTable({ executions }: ExecutionTableProps) {
  return (
    <section className="execution-panel">
      <div className="dashboard-meta">
        <div>
          <p className="section-label">最近执行</p>
          <h2>调价历史</h2>
        </div>
      </div>

      <div className="execution-table-wrap">
        <table className="execution-table">
          <thead>
            <tr>
              <th>商品</th>
              <th>建议价</th>
              <th>实际价</th>
              <th>状态</th>
              <th>竞品</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {executions.length === 0 ? (
              <tr>
                <td colSpan={6}>还没有调价记录</td>
              </tr>
            ) : (
              executions.map((execution) => (
                <tr key={execution.id}>
                  <td>{execution.productTitle}</td>
                  <td>{formatMoney(execution.suggestedPrice)}</td>
                  <td>{formatMoney(execution.appliedPrice)}</td>
                  <td>{formatStatus(execution.status)}</td>
                  <td>
                    {execution.matchedCompetitor
                      ? `${execution.matchedCompetitor.sellerName} / ${formatMoney(execution.matchedCompetitor.price)}`
                      : "无"}
                  </td>
                  <td>{execution.executedAt.replace("T", " ").slice(0, 19)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
