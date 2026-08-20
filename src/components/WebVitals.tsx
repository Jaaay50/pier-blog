'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 只在生產環境發送或記錄性能數據
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // 定義閾值（Core Web Vitals 標準）
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      LCP: { good: 2500, poor: 4000 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 },
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

    if (threshold) {
      if (metric.value > threshold.poor) {
        rating = 'poor';
      } else if (metric.value > threshold.good) {
        rating = 'needs-improvement';
      }
    }

    // 構建數據負載
    const body = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating || rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      path: window.location.pathname,
      referrer: document.referrer || '(direct)',
      // 設備信息
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      connection: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType || 'unknown',
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown',
    };

    // 使用 sendBeacon 確保數據可靠發送（即使在頁面卸載時）
    // 如果需要發送到後端，可以發送到 /api/vitals
    // navigator.sendBeacon('/api/vitals', JSON.stringify(body));

    // 目前先記錄到控制台，poor 級別的指標會用 warn 標記
    if (rating === 'poor') {
      console.warn(`[Web Vitals] Poor ${metric.name}:`, metric.value.toFixed(2), body);
    } else if (rating === 'needs-improvement') {
      console.log(`[Web Vitals] Needs improvement ${metric.name}:`, metric.value.toFixed(2), body);
    } else {
      console.log(`[Web Vitals] Good ${metric.name}:`, metric.value.toFixed(2), body);
    }

    // 如果未來要發送到分析服務，可以解除註釋：
    // if (typeof window.gtag !== 'undefined') {
    //   window.gtag('event', metric.name, {
    //     event_category: 'Web Vitals',
    //     value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    //     event_label: metric.id,
    //     non_interaction: true,
    //   });
    // }
  });

  return null;
}
