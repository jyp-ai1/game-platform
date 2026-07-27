"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AnalyticsBridge = dynamic(
  () => import("@/components/analytics-bridge").then((m) => ({ default: m.AnalyticsBridge })),
  { ssr: false }
);
const ProductMetricsBridge = dynamic(
  () =>
    import("@/components/product-metrics-bridge").then((m) => ({
      default: m.ProductMetricsBridge,
    })),
  { ssr: false }
);
const MonitoringProvider = dynamic(
  () =>
    import("@/components/monitoring-provider").then((m) => ({
      default: m.MonitoringProvider,
    })),
  { ssr: false }
);

/** Analytics / telemetry — after first paint (does not block LCP). */
export function DeferredClientBridges() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ric = window.requestIdleCallback?.(() => setReady(true), { timeout: 2000 });
    if (ric != null) {
      return () => window.cancelIdleCallback(ric);
    }
    const t = window.setTimeout(() => setReady(true), 1);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) return null;

  return (
    <>
      <AnalyticsBridge />
      <ProductMetricsBridge />
      <MonitoringProvider />
    </>
  );
}
