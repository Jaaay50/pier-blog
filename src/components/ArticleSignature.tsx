import { PierGlyph } from "@/components/brand/PierGlyph";
import { TransitionLink } from "@/components/TransitionLink";

export function ArticleSignature({ leaveLabel }: { leaveLabel: string }) {
  return (
    <div className="article-signature">
      <span className="article-signature-mark" aria-hidden>
        <PierGlyph size={28} />
      </span>
      <TransitionLink href="/guestbook" className="article-signature-link">
        {leaveLabel}
      </TransitionLink>
    </div>
  );
}
