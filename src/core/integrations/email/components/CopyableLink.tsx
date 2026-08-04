import { Link, Text } from "@react-email/components";

/**
 * Monospaced URL block + share-via-email affordance.
 *
 * Email clients strip JavaScript, so a real "Copy" button is not portable.
 * Instead, render the URL as a selectable monospace block — recipients can
 * long-press (mobile) or triple-click (desktop) to copy. Pair it with a
 * `mailto:` link so users can one-tap forward the URL through their mail
 * client, which is the most reliable cross-client "share" channel inside
 * an email.
 *
 * Visual hierarchy: helper text muted, URL block inset on canvas colour,
 * share link in brand colour. All three pieces render into the plain-text
 * fallback produced by `render(..., { plainText: true })` automatically.
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
        className="m-0 mb-4 bg-canvas border border-solid border-stroke rounded-md px-4 py-3 text-13 text-fg-2"
        style={{ fontFamily: MONO_FONT_STACK, wordBreak: "break-all" }}
      >
        {url}
      </Text>
      {mailtoHref ? (
        <Text className="m-0 mb-0 font-sans text-13">
          <Link
            href={mailtoHref}
            className="text-brand no-underline font-semibold"
          >
            Share via email &rarr;
          </Link>
        </Text>
      ) : null}
    </>
  );
}
