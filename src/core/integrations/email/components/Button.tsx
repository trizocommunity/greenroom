import { Button } from "@react-email/components";

/**
 * Primary CTA button. Solid brand background, white text, no border.
 * Keep label text short — button width is content-sized, not full-width.
 */
export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Button
      href={href}
      className="bg-brand text-fg-inverted rounded-md px-7 py-3 font-sans font-semibold text-15 no-underline"
    >
      {children}
    </Button>
  );
}
