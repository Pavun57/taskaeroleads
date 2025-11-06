import { Navigation } from "@/components/navigation"
import { FeatureCard } from "@/components/feature-card"

const features = [
  {
    title: "LinkedIn Scraper",
    description: "Extract professional data from LinkedIn with advanced filtering and automation",
    icon: "Linkedin",
    href: "/linkedin-scraper",
    color: "from-blue-600 to-blue-400",
    stats: "10k+ profiles",
  },
  {
    title: "Autodialer",
    description: "Automated calling campaigns with intelligent routing and call tracking",
    icon: "Phone",
    href: "/autodialer",
    color: "from-green-600 to-green-400",
    stats: "5k+ calls/day",
  },
  {
    title: "Blog Writer",
    description: "AI-powered blog post generation with SEO optimization and formatting",
    icon: "FileText",
    href: "/blog-writer",
    color: "from-purple-600 to-purple-400",
    stats: "100+ articles",
  },
  {
    title: "Configuration",
    description: "Manage API keys, authentication, and platform settings securely",
    icon: "Settings",
    href: "/configuration",
    color: "from-slate-600 to-slate-400",
    stats: "System settings",
  },
]

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-balance">
                <span className="gradient-primary bg-clip-text text-transparent">Aeroleads</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-balance">
                Power up your workflow with intelligent automation. Manage LinkedIn scraping, autodialer campaigns, and
                AI-generated content all in one platform.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Created by <span className="font-semibold text-foreground">PAVUN KUMAR R</span>
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="px-4 py-2 rounded-full bg-secondary text-sm">✓ Enterprise-grade security</div>
                <div className="px-4 py-2 rounded-full bg-secondary text-sm">✓ Real-time analytics</div>
                <div className="px-4 py-2 rounded-full bg-secondary text-sm">✓ 24/7 automation</div>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} style={{ animationDelay: `${index * 100}ms` }} className="fade-in">
                  <FeatureCard {...feature} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
