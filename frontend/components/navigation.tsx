"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Zap, Settings, Linkedin, Phone, FileText } from "lucide-react"

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: Zap,
    shortcut: "cmd+1",
  },
  {
    href: "/configuration",
    label: "Configuration",
    icon: Settings,
    shortcut: "cmd+2",
  },
  {
    href: "/linkedin-scraper",
    label: "LinkedIn Scraper",
    icon: Linkedin,
    shortcut: "cmd+3",
  },
  {
    href: "/autodialer",
    label: "Autodialer",
    icon: Phone,
    shortcut: "cmd+4",
  },
  {
    href: "/blog-writer",
    label: "Blog Writer",
    icon: FileText,
    shortcut: "cmd+5",
  },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur-sm supports-[backdrop-filter]:bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="gradient-primary p-2 rounded-lg">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              AI Task Hub
            </span>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.slice(1).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile Menu Indicator */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              href="/"
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                pathname === "/" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
              )}
            >
              <Zap className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
