# DevOps Rollback Drill — Sprint 12 GA

**Date:** ___________________  
**Operator:** ___________________  
**Environment:** Production — Vercel project **game29**

---

## Procedure

1. Open Vercel → **game29** → **Deployments**
2. Note current Production deployment ID: ___________________
3. Select **previous** successful deployment → **Promote to Production**
4. **Start timer**
5. Verify: `curl -I https://game29.vercel.app/` → expect **200**
6. Optional: `/admin/monitoring` → 200
7. **Stop timer**

| Metric | Value |
| --- | --- |
| Rollback time | _____ sec |
| Target | ≤ 15 sec |
| HTTP status | _____ |
| Result | PASS / FAIL |

8. **Promote** latest deployment (`1820955` / Sprint 12) back to Production
9. Verify Production restored → 200

---

## Result

```
Rollback Drill: PASS / FAIL — _____ sec
```

**Senior DevOps sign-off:** ___________________
