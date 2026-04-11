"use client";

import { useState, useTransition } from "react";
import type { TakealotSellerApiSettingsReport } from "@/lib/takealot-seller-api-settings";

type SellerApiSettingsPanelProps = {
  initialReport: TakealotSellerApiSettingsReport;
  disabled?: boolean;
  onSaved?: (message: string) => void;
};

type SettingsResponse = TakealotSellerApiSettingsReport;

export function SellerApiSettingsPanel({
  initialReport,
  disabled,
  onSaved
}: SellerApiSettingsPanelProps) {
  const [report, setReport] = useState(initialReport);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initialReport.settings.baseUrl);
  const [dryRun, setDryRun] = useState(initialReport.settings.dryRun);
  const [authHeaderName, setAuthHeaderName] = useState(
    initialReport.settings.authHeaderName
  );
  const [authHeaderPrefix, setAuthHeaderPrefix] = useState(
    initialReport.settings.authHeaderPrefix
  );
  const [ownListingPathTemplate, setOwnListingPathTemplate] = useState(
    initialReport.settings.ownListingPathTemplate
  );
  const [isPending, startTransition] = useTransition();

  async function saveSettings() {
    const response = await fetch("/api/integrations/takealot-seller-api/settings", {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        apiKey,
        baseUrl,
        dryRun,
        authHeaderName,
        authHeaderPrefix,
        ownListingPathTemplate
      })
    });
    const payload = (await response.json()) as SettingsResponse;

    setReport(payload);
    setApiKey("");
    setBaseUrl(payload.settings.baseUrl);
    setDryRun(payload.settings.dryRun);
    setAuthHeaderName(payload.settings.authHeaderName);
    setAuthHeaderPrefix(payload.settings.authHeaderPrefix);
    setOwnListingPathTemplate(payload.settings.ownListingPathTemplate);
    onSaved?.("已保存 Seller API 设置并刷新运行时接入状态");
  }

  return (
    <section className="integration-panel">
      <div className="dashboard-meta">
        <div>
          <p className="section-label">接入设置</p>
          <h2>Seller API 接入设置</h2>
        </div>
        <div className="integration-status">
          <strong>
            {report.settings.apiKeyConfigured ? "API key 已配置" : "API key 未配置"}
          </strong>
          <span>
            {report.readiness.canReadOwnListings
              ? "own listing 读取已就绪"
              : "own listing 读取未就绪"}
          </span>
        </div>
      </div>

      <form
        className="integration-form"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            void saveSettings();
          });
        }}
      >
        <label>
          <span>替换 API key</span>
          <input
            type="password"
            value={apiKey}
            placeholder={
              report.settings.apiKeyPreview
                ? `当前 ${report.settings.apiKeyPreview}，留空则保持不变`
                : "输入新的 Seller API key"
            }
            disabled={disabled || isPending}
            onChange={(event) => {
              setApiKey(event.target.value);
            }}
          />
        </label>
        <label>
          <span>Seller API Base URL</span>
          <input
            value={baseUrl}
            disabled={disabled || isPending}
            onChange={(event) => {
              setBaseUrl(event.target.value);
            }}
          />
        </label>
        <label>
          <span>Auth Header Name</span>
          <input
            value={authHeaderName}
            disabled={disabled || isPending}
            onChange={(event) => {
              setAuthHeaderName(event.target.value);
            }}
          />
        </label>
        <label>
          <span>Auth Header Prefix</span>
          <input
            value={authHeaderPrefix}
            disabled={disabled || isPending}
            onChange={(event) => {
              setAuthHeaderPrefix(event.target.value);
            }}
          />
        </label>
        <label>
          <span>Own Listing Path</span>
          <input
            value={ownListingPathTemplate}
            disabled={disabled || isPending}
            onChange={(event) => {
              setOwnListingPathTemplate(event.target.value);
            }}
          />
        </label>
        <label>
          <span>写价模式</span>
          <select
            value={dryRun ? "true" : "false"}
            disabled={disabled || isPending}
            onChange={(event) => {
              setDryRun(event.target.value !== "false");
            }}
          >
            <option value="true">dry-run</option>
            <option value="false">live 请求</option>
          </select>
        </label>
        <div className="integration-actions">
          <button
            type="submit"
            className="ghost-button"
            disabled={disabled || isPending}
          >
            保存 Seller API 设置
          </button>
          <p className="status-note">
            {report.readiness.checks[report.readiness.checks.length - 1]?.message ??
              "图形化设置只负责本地持久化和运行时接入，不会伪造官方协议。"}
          </p>
        </div>
      </form>
    </section>
  );
}
