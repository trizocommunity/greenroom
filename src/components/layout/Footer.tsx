import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto text-foreground border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-black text-2xl tracking-tighter uppercase bg-gradient-to-r from-primary via-secondary to-primary/80 bg-clip-text text-transparent hover:opacity-90 transition-opacity mb-4">
              Greenroom
            </Link>
            <p className="text-muted-foreground max-w-sm leading-relaxed">
              A premium, reliable platform to run large-scale festivals without
              chaos — paperless, transparent, and built for the institutions
              that stage them.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-medium mb-5 text-heading">Platform</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/features"
                  className="hover:text-primary transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="hover:text-primary transition-colors"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-primary transition-colors"
                >
                  About us
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-primary transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-5 text-heading">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>support@greenroom.com</li>
              <li>+1 (555) 123-4567</li>
              <li>
                <Link href="/contact" className="text-primary hover:underline">
                  Get in touch
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Greenroom. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy policy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms of service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
