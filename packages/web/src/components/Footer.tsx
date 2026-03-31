import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-[#141519] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Info */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center mb-3">
              <span className="text-[#F47521] font-bold text-xl tracking-widest select-none">
                BABYLON
              </span>
            </Link>
            <p className="text-sm text-[#a0a0a0] mt-4 leading-relaxed">
              Your personal anime streaming and download platform. Curate, organize, and watch your collection.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Explore</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/anime" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Library
                </Link>
              </li>
              <li>
                <Link href="/discover" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Discover
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Search
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="https://github.com" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors" target="_blank" rel="noopener noreferrer">
                  GitHub
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/settings" className="text-sm text-[#a0a0a0] hover:text-[#F47521] transition-colors">
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#23252b] bg-[#0a0a0c]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center text-xs text-[#a0a0a0]">
            <span>Babylon &mdash; Personal Media Server</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
