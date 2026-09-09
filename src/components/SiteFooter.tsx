'use client';

import { TransitionLink } from '@/components/TransitionLink';
import { PierWordmark } from '@/components/brand/PierWordmark';
import { PierGlyph } from '@/components/brand/PierGlyph';
import { useTranslations } from 'next-intl';

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function SiteFooter() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-[var(--border)]">
      {/* Π glyph 水印：右下角极淡 */}
      <div className="pointer-events-none absolute -bottom-6 -right-4" aria-hidden>
        <PierGlyph size={140} className="text-[var(--text-muted)] opacity-[0.04]" />
      </div>
      <div className="site-shell mx-auto py-12">
        {/* Three-column grid */}
        <div className="grid min-w-0 gap-10 sm:grid-cols-3">
          {/* Col 1: Brand */}
          <div className="min-w-0">
            <div className="mb-2 text-sm text-[var(--text-primary)]">
              <PierWordmark withWaterline />
            </div>
          </div>

          {/* Col 2: Navigation */}
          <nav className="min-w-0" aria-label={t('navTitle')}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {t('navTitle')}
            </p>
            <ul className="space-y-1">
              {([
                { href: '/blog', label: tNav('blog') },
                { href: '/about', label: tNav('about') },
                { href: '/portfolio', label: tNav('portfolio') },
                { href: '/currents/agent', label: t('agent') },
                { href: '/currents/changelog', label: t('changelog') },
                { href: '/guestbook', label: t('guestbook') },
                { href: '/feedback', label: t('feedback') },
              ] as const).map(({ href, label }) => (
                <li key={href}>
                  <TransitionLink
                    href={href}
                    className="inline-flex min-h-11 max-w-full items-center text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    {label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Col 3: Subscribe / Links */}
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {t('externalTitle')}
            </p>
            <div className="flex flex-col items-start gap-1">
              <a
                href="https://github.com/Jia-Ethan"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`GitHub (${t('opensInNewWindow')})`}
                className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <GithubIcon />
                GitHub
              </a>
              <a
                href="https://cloudborne.cn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('cloudborne')} (${t('opensInNewWindow')})`}
                className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {t('cloudborne')} ↗
              </a>
            </div>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-[var(--border)] pt-6 sm:flex-row">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Pier.
          </p>
        </div>
      </div>
    </footer>
  );
}
