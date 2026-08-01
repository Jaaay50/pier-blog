import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers.
 * 用这里导出的 Link / useRouter / usePathname 替代 next/navigation 和 next/link，
 * 可自动附加 locale 前缀，无需手动拼接。
 */
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
