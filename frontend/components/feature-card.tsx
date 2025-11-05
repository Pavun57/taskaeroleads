"use client"

import Link from "next/link"
import { Linkedin, Phone, FileText, Settings, type LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  Linkedin,
  Phone,
  FileText,
  Settings,
}

interface FeatureCardProps {
  title: string
  description: string
  icon: string
  href: string
  color: string
  stats: string
}

export function FeatureCard({ title, description, icon, href, color, stats }: FeatureCardProps) {
  const Icon = iconMap[icon]
  return (
    <Link href={href}>
      <div className="group relative h-full card-hover">
        {/* Gradient Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${color} rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
        />

        {/* Card Content */}
        <div className="relative p-6 sm:p-8 bg-card border border-border rounded-2xl h-full flex flex-col">
          {/* Icon Container */}
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} p-2.5 mb-4 flex items-center justify-center`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 flex-grow">{description}</p>

          {/* Stats Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-xs font-medium text-accent">{stats}</span>
            <span className="text-primary group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
