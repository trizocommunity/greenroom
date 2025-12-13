import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 mt-auto text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
               <div className="w-6 h-6 bg-primary text-primary-foreground rounded-sm flex items-center justify-center font-bold text-xs">
                  G
               </div>
               <span className="font-bold text-xl uppercase tracking-tighter">Greenroom</span>
            </Link>
            <p className="text-muted-foreground max-w-sm">
              The premium, paperless festival management platform used by top institutions to run fair and efficient events.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold uppercase tracking-wide mb-4 text-primary">Platform</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              <li><Link href="/features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Services</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wide mb-4 text-primary">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              <li>support@greenroom.com</li>
              <li>+1 (555) 123-4567</li>
              <li><Link href="/contact" className="text-primary hover:underline">Get in Touch</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 uppercase font-medium tracking-wider">
          <p>&copy; {new Date().getFullYear()} Greenroom. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
             <Link href="#" className="hover:text-primary">Privacy Policy</Link>
             <Link href="#" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
