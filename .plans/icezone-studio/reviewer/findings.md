# reviewer - 发现索引

> 纯索引——每个条目应简短（Status + Report 链接 + Summary）。

---

1. **[OK] image-processing** — [report](review-image-processing/findings.md) — 初审 3 MEDIUM 已全部修复，通过。
2. **[WARN] auth-shell** — [report](review-auth-shell/findings.md) — 0 CRITICAL, 1 HIGH (callback 开放重定向), 3 MEDIUM (i18n 未接入/RLS INSERT 缺失/onAuthStateChange 未清理)。H1 建议合并前修复。
