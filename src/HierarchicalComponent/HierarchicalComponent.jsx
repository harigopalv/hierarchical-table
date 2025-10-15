import React, { useState, useMemo } from "react";

export default function HierarchicalComponent() {
  const initialState = {
    rows: [
      {
        id: "electronics",
        label: "Electronics",
        value: 1400,
        variance: "",
        children: [
          { id: "phones", label: "Phones", value: 800, variance: "" },
          { id: "laptops", label: "Laptops", value: 700, variance: "" },
        ],
      },
      {
        id: "furniture",
        label: "Furniture",
        value: 1000,
        variance: "",
        children: [
          { id: "tables", label: "Tables", value: 300, variance: "" },
          { id: "chairs", label: "Chairs", value: 700, variance: "" },
        ],
      },
    ],
  };

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  const calculateSubtotals = (rows) =>
    rows.map((r) => {
      if (r.children && r.children.length) {
        const updatedChildren = calculateSubtotals(r.children);
        const subtotal = updatedChildren.reduce((s, c) => s + c.value, 0);
        return { ...r, value: +subtotal.toFixed(2), children: updatedChildren };
      }
      return { ...r };
    });

  const buildOriginalMap = (rows, map = {}) => {
    for (const r of rows) {
      if (r.children && r.children.length) {
        buildOriginalMap(r.children, map);
        const childrenSum = r.children.reduce((s, c) => s + map[c.id], 0);
        map[r.id] = +childrenSum.toFixed(2);
      } else {
        map[r.id] = r.value;
      }
    }
    return map;
  };

  const recalcVariances = (rows, originalMap) =>
    rows.map((r) => {
      const orig = originalMap[r.id] ?? 0;
      const variance =
        orig !== 0 ? Number(((r.value - orig) / orig) * 100).toFixed(2) : "0.00";
      return {
        ...r,
        variance,
        children: r.children ? recalcVariances(r.children, originalMap) : undefined,
      };
    });

  const distributeToChildrenRecursive = (node, newValue) => {
    if (!node.children || node.children.length === 0) {
      return { ...node, value: +newValue.toFixed(2) };
    }

    const total = node.children.reduce((sum, c) => sum + c.value, 0) || 1;
    const newChildren = node.children.map((child) => {
      const proportion = child.value / total;
      const childNewValue = +((proportion * newValue).toFixed(2));
      return distributeToChildrenRecursive(child, childNewValue);
    });

    return { ...node, value: +newValue.toFixed(2), children: newChildren };
  };

  const updateNodeById = (rows, id, newValue, isPercent = false) =>
    rows.map((r) => {
      if (r.id === id) {
        const computedValue = isPercent ? r.value * (1 + newValue / 100) : newValue;
        if (r.children && r.children.length) {
          return distributeToChildrenRecursive(r, computedValue);
        } else {
          return { ...r, value: +computedValue.toFixed(2) };
        }
      } else if (r.children && r.children.length) {
        return { ...r, children: updateNodeById(r.children, id, newValue, isPercent) };
      }
      return r;
    });

  const initialRowsWithSubtotals = useMemo(() => {
    const recalculated = calculateSubtotals(deepClone(initialState.rows));
    return recalculated;
  }, []);

  const originalMapInit = useMemo(
    () => buildOriginalMap(deepClone(initialRowsWithSubtotals)),
    [initialRowsWithSubtotals]
  );

  const [rows, setRows] = useState(() => {
    const withVariance = recalcVariances(initialRowsWithSubtotals, originalMapInit);
    return withVariance;
  });

  const originalMap = useMemo(() => originalMapInit, [originalMapInit]);

  const recomputeAll = (currentRows) => {
    const subtotalsCorrected = calculateSubtotals(currentRows);
    const withVariances = recalcVariances(subtotalsCorrected, originalMap);
    return withVariances;
  };

  const handleUpdate = (id, rawInput, type) => {
    if (rawInput === null || rawInput === undefined || rawInput === "") return;
    const parsed = parseFloat(rawInput);
    if (Number.isNaN(parsed)) return;

    const isPercent = type === "percent";
    const updated = updateNodeById(deepClone(rows), id, parsed, isPercent);
    const final = recomputeAll(updated);
    setRows(final);
  };

  const renderRows = (list, level = 0) =>
    list.map((r) => {
      const indent = { paddingLeft: `${level * 24}px` };
      return (
        <React.Fragment key={r.id}>
          <tr className={r.children && r.children.length ? "parent-row" : ""}>
            <td style={indent}>{r.label}</td>
            <td>{Number(r.value).toFixed(2)}</td>
            <td>
              <input
                type="number"
                id={`input-${r.id}`}
                placeholder="Enter value or %"
                style={{ width: 120 }}
              />
            </td>
            <td>
              <button
                onClick={() =>
                  handleUpdate(r.id, document.getElementById(`input-${r.id}`).value, "percent")
                }
              >
                Allocation %
              </button>
            </td>
            <td>
              <button
                onClick={() =>
                  handleUpdate(r.id, document.getElementById(`input-${r.id}`).value, "value")
                }
              >
                Allocation Val
              </button>
            </td>
            <td>
              {r.variance}%
            </td>
          </tr>

          {r.children && r.children.length > 0 && renderRows(r.children, level + 1)}
        </React.Fragment>
      );
    });

  const grandTotal = rows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="table-container">
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        Hierarchical Allocation Table
      </h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>Label</th>
            <th style={{ textAlign: "left", padding: 8 }}>Value</th>
            <th style={{ textAlign: "left", padding: 8 }}>Input</th>
            <th style={{ textAlign: "left", padding: 8 }}>Allocation %</th>
            <th style={{ textAlign: "left", padding: 8 }}>Allocation Val</th>
            <th style={{ textAlign: "left", padding: 8 }}>Variance %</th>
          </tr>
        </thead>

        <tbody>{renderRows(rows)}</tbody>

        <tfoot>
          <tr style={{ fontWeight: 700 }}>
            <td style={{ padding: 8 }}>Grand Total</td>
            <td style={{ padding: 8 }}>{grandTotal.toFixed(2)}</td>
            <td colSpan={4}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
