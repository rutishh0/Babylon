import Link from "next/link"
import { Globe, ChevronDown } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#141519] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Info */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/dashboard" className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 48 48" className="h-7 w-7 text-[#F47521]" fill="currentColor">
                <path d="M24 2C11.85 2 2 11.85 2 24s9.85 22 22 22 22-9.85 22-22S36.15 2 24 2zm0 38c-8.82 0-16-7.18-16-16S15.18 8 24 8s16 7.18 16 16-7.18 16-16 16zm-4-22a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
              </svg>
              <span className="text-white font-semibold text-lg">Crunchyroll</span>
            </Link>
            <p className="text-sm text-[#a0a0a0] mb-1">
              <span className="tracking-widest">SONY PICTURES</span>
              <span className="mx-2 text-[#3a3c42]">|</span>
              <span>&copy; Crunchyroll, LLC</span>
            </p>
            <p className="text-sm text-[#a0a0a0] mt-4 leading-relaxed">
              Welcome to Crunchyroll, your ultimate destination for streaming the best in anime entertainment.
            </p>
            
            {/* Social Icons */}
            <div className="flex items-center gap-4 mt-4">
              <Link href="#" className="text-white hover:text-[#F47521] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </Link>
              <Link href="#" className="text-white hover:text-[#F47521] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </Link>
              <Link href="#" className="text-white hover:text-[#F47521] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </Link>
              <Link href="#" className="text-white hover:text-[#F47521] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </Link>
              <Link href="#" className="text-white hover:text-[#F47521] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </Link>
              <Link href="#" className="text-white hover:text-[#F47521] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
              </Link>
            </div>

            {/* Language Selector */}
            <button className="flex items-center gap-2 px-4 py-2 mt-6 border border-[#3a3c42] rounded-md hover:bg-[#23252b] transition-colors">
              <Globe className="w-4 h-4 text-white" />
              <span className="text-sm text-white">English (US)</span>
              <ChevronDown className="w-4 h-4 text-[#a0a0a0]" />
            </button>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Explore</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/discover" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Browse Popular
                </Link>
              </li>
              <li>
                <Link href="/simulcast" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Browse Simulcasts
                </Link>
              </li>
              <li>
                <Link href="/simulcast" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Release Calendar
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Get the Apps
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Jobs
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Advertising Inquiries
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Press Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/user/profile" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Switch Profile
                </Link>
              </li>
              <li>
                <Link href="/user/watchlist" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Watchlist
                </Link>
              </li>
              <li>
                <Link href="/user/crunchylists" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Crunchylists
                </Link>
              </li>
              <li>
                <Link href="/user/history" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  History
                </Link>
              </li>
              <li>
                <Link href="/user/settings" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  My Account
                </Link>
              </li>
              <li>
                <Link href="/user/gift-card" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Redeem Gift Card
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Log Out
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#23252b] bg-[#0a0a0c]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#a0a0a0]">
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Cookie Consent Tool</Link>
            <Link href="#" className="hover:text-white transition-colors">AdChoices</Link>
            <Link href="#" className="hover:text-white transition-colors">Do Not Sell or Share My Personal Information</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
