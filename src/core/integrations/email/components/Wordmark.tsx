import { Link, Text } from "@react-email/components";

/**
 * Inline brand mark used in the email header.
 *
 * Inline text + span (no `<Img>`) so the email renders even when the
 * recipient's client blocks external images. The red dot accent mirrors
 * the primary brand colour from the Tailwind config.
 */
export function EmailWordmark() {
  return (
    <Text className="m-0 mb-8 font-sans font-bold text-24 text-fg leading-none tracking-tight">
      <Link
        href="https://greenroomm.vercel.app"
        className="text-fg no-underline"
      >
        Greenroom
      </Link>
      <span className="inline-block w-2 h-2 rounded-full bg-brand ml-1.5 align-middle">
        &nbsp;
      </span>
    </Text>
  );
}
