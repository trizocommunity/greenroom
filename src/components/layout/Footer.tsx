import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto text-foreground border-t border-white/10 bg-background/50 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-2xl bg-linear-to-br from-primary to-orange-400 text-white flex items-center justify-center font-bold text-xs shadow-[0_6px_18px_rgba(124,58,237,0.3)]">
                G
              </div>
              <span className="font-black uppercase tracking-tighter text-xl">
                Greenroom
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm font-medium">
              The premium, paperless festival management platform used by top
              institutions to run fair and efficient events.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold uppercase tracking-widest mb-6 text-foreground text-sm">
              Platform
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
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
                  About Us
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
            <h4 className="font-bold uppercase tracking-widest mb-6 text-foreground text-sm">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              <li>support@greenroom.com</li>
              <li>+1 (555) 123-4567</li>
              <li>
                <Link href="/contact" className="text-primary hover:underline">
                  Get in Touch
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
          <p>
            &copy; {new Date().getFullYear()} Greenroom. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
