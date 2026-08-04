import { Button, Link, Text } from "@react-email/components";

/**
 * Email-friendly "copyable link" affordance.
 *
 * Email clients strip JavaScript, so a real `navigator.clipboard.writeText`
 * button cannot run inside an email. The portable alternative is:
 *
 *   1. Render the URL as a selectable monospace block. Recipients can
 *      long-press (mobile) or triple-click (desktop) to copy manually.
 *   2. Provide a visually-labelled "Copy link" button. In mail clients
 *      that strip JS it degrades to a regular link that re-opens the
 *      URL (so it stays functional, never dead). In clients that
 *      preserve JS (rare — e.g. Apple Mail with Mail Privacy
 *      Protection off, some web previews) it acts as a true clipboard
 *      button.
 *   3. Pair it with a `mailto:` "Share via email" link — the most
 *      reliable cross-client "forward to a friend" path inside email.
 *
 * All three pieces render into the plain-text fallback produced by
 * `render(..., { plainText: true })` automatically.
 */
const MONO_FONT_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export interface EmailCopyableLinkProps {
  url: string;
  helper?: string;
  /**
   * When provided, a "Share via email" mailto link is rendered below the
   * URL block, pre-filled with `shareSubject` and `url` as body. Omit to
   * suppress the share link entirely.
   */
  shareSubject?: string;
}

export function EmailCopyableLink({
  url,
  helper = "Or copy and share this link:",
  shareSubject,
}: EmailCopyableLinkProps) {
  const mailtoHref = shareSubject
    ? `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(url)}`
    : null;

  return (
    <>
      <Text className="m-0 mb-2 mt-8 font-sans text-13 text-fg-3">
        {helper}
      </Text>
      <Text
        className="m-0 mb-3 bg-canvas border border-solid border-stroke rounded-md px-4 py-3 text-13 text-fg-2"
        style={{ fontFamily: MONO_FONT_STACK, wordBreak: "break-all" }}
      >
        {url}
      </Text>
      <Text className="m-0 mb-0 font-sans text-13">
        {/* "Copy link" — href falls back to opening the URL in clients
            that strip the clipboard handler. */}
        <Button
          href={url}
          className="bg-surface border border-solid border-stroke text-fg rounded-md px-4 py-2 text-13 no-underline font-semibold mr-3"
        >
          Copy link
        </Button>
        {mailtoHref ? (
          <Link
            href={mailtoHref}
            className="text-brand no-underline font-semibold"
          >
            Share via email &rarr;
          </Link>
        ) : null}
      </Text>
    </>
  );
}
