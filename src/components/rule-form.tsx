"use client";

import { useState } from "react";
import type { ProductMonitor } from "@/core/types";

type RuleFormProps = {
  product: ProductMonitor;
  disabled?: boolean;
  onSave: (
    patch: Pick<
      ProductMonitor["rule"],
      "undercutBy" | "floorPrice" | "ceilingPrice" | "costPrice" | "minMargin"
    >
  ) => void;
};

export function RuleForm({ product, disabled, onSave }: RuleFormProps) {
  const [values, setValues] = useState({
    undercutBy: String(product.rule.undercutBy),
    floorPrice: String(product.rule.floorPrice),
    ceilingPrice: String(product.rule.ceilingPrice ?? ""),
    costPrice: String(product.rule.costPrice),
    minMargin: String(product.rule.minMargin)
  });

  return (
    <form
      className="rule-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          undercutBy: Number(values.undercutBy),
          floorPrice: Number(values.floorPrice),
          ceilingPrice: Number(values.ceilingPrice),
          costPrice: Number(values.costPrice),
          minMargin: Number(values.minMargin)
        });
      }}
    >
      <label>
        <span>跟价步长</span>
        <input
          value={values.undercutBy}
          disabled={disabled}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              undercutBy: event.target.value
            }))
          }
        />
      </label>
      <label>
        <span>地板价</span>
        <input
          value={values.floorPrice}
          disabled={disabled}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              floorPrice: event.target.value
            }))
          }
        />
      </label>
      <label>
        <span>封顶价</span>
        <input
          value={values.ceilingPrice}
          disabled={disabled}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              ceilingPrice: event.target.value
            }))
          }
        />
      </label>
      <label>
        <span>成本价</span>
        <input
          value={values.costPrice}
          disabled={disabled}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              costPrice: event.target.value
            }))
          }
        />
      </label>
      <label>
        <span>最低利润</span>
        <input
          value={values.minMargin}
          disabled={disabled}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              minMargin: event.target.value
            }))
          }
        />
      </label>
      <button type="submit" className="ghost-button" disabled={disabled}>
        保存规则
      </button>
    </form>
  );
}
