"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sendSiteVisit } from "@/lib/site-traffic";

export function SiteTrafficBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname || window.location.pathname;
    const fire = () => sendSiteVisit(path);
    const doc = document as Document & { prerendering?: boolean };
    if (doc.prerendering) {
      document.addEventListener("prerenderingchange", fire, { once: true });
      return () => document.removeEventListener("prerenderingchange", fire);
    }
    fire();
    return undefined;
  }, [pathname]);

  return null;
}
