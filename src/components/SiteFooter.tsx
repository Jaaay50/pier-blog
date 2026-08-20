'use client';

import { TransitionLink } from '@/components/TransitionLink';
import { PierWordmark } from '@/components/brand/PierWordmark';
import { PierGlyph } from '@/components/brand/PierGlyph';
import { useTranslations } from 'next-intl';

interface SiteFooterProps {
  /** Currents 产品面：使用 --currents-shell-max（1760px）自适应工作台宽度 */
  currentsWidth?: boolean;
}

function RssIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function SiteFooter({ currentsWidth = false }: SiteFooterProps) {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-[var(--border)]">
      {/* Π glyph 水印：右下角极淡 */}
      <div className="pointer-events-none absolute -bottom-6 -right-4" aria-hidden>
        <PierGlyph size={140} className="text-[var(--text-muted)] opacity-[0.04]" />
      </div>
      <div className={currentsWidth ? 'currents-shell-container mx-auto py-12' : 'site-shell mx-auto py-12'}>
        {/* Three-column grid */}
        <div className="grid gap-10 sm:grid-cols-3">
          {/* Col 1: Brand */}
          <div>
            <div className="mb-2 text-sm text-[var(--text-primary)]">
              <PierWordmark withWaterline />
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {t('tagline')}
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {t('navTitle')}
            </p>
            <ul className="space-y-2">
              {([
                { href: '/blog', label: tNav('blog') },
                { href: '/about', label: tNav('about') },
                { href: '/portfolio', label: tNav('portfolio') },
                { href: '/currents/agent', label: t('agent') },
                { href: '/currents/changelog', label: t('changelog') },
                { href: '/feedback', label: t('feedback') },
              ] as const).map(({ href, label }) => (
                <li key={href}>
                  <TransitionLink
                    href={href}
                    className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Subscribe / Links */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {t('subscribeTitle')}
            </p>
            <div className="space-y-2">
              <a
                href="/feed.xml"
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <RssIcon />
                {t('rssEn')}
              </a>
              <a
                href="/feed-zh.xml"
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <RssIcon />
                {t('rssZh')}
              </a>
              <a
                href="https://github.com/Jia-Ethan"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <GithubIcon />
                GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-[var(--border)] pt-6 sm:flex-row">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Pier.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {t('builtWith')}
          </p>
        </div>
      </div>
    </footer>
  );
}
