import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Key,
  Users,
  Smartphone,
  Shield,
  Server,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  Replace,
  Power,
} from 'lucide-react'
import { Card } from '@real-life-stack/toolkit'
import { useLanguage } from '../i18n/LanguageContext'
import { translations } from '../i18n/translations'
import Header from '../components/Header'
import Footer from '../components/Footer'

const pillarIcons = [Key, Users, Smartphone]

const statusColors = {
  decentralized: { bg: 'bg-green-500/10', text: 'text-green-600', dot: 'bg-green-500' },
  server: { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500' },
  manual: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  wot: { bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
}

const protectionIcons = [Eye, Shield, Replace, Power]

export default function ArchitecturePage() {
  const { t } = useLanguage()
  // Fall back to EN if the current language doesn't have architecture translations
  const arch = t.architecture || translations.en.architecture
  const [openFaq, setOpenFaq] = useState({})

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            {arch.backToHome}
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            {arch.title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
            {arch.subtitle}
          </p>
        </section>

        {/* Three Pillars */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <h2 className="text-2xl font-bold text-foreground mb-8">{arch.pillars.title}</h2>
          <div className="grid gap-6">
            {arch.pillars.items.map((pillar, i) => {
              const Icon = pillarIcons[i]
              return (
                <Card key={i} className="px-6 gap-0">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{pillar.title}</h3>
                      <p className="text-muted-foreground mb-3">{pillar.description}</p>
                      <p className="text-sm text-muted-foreground/80 border-l-2 border-primary/20 pl-3">
                        {pillar.technical}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Decentralized vs Server */}
        <section className="bg-muted py-16 mb-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-10">{arch.decentralized.title}</h2>

            {/* Fully Decentralized */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="text-green-600" size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{arch.decentralized.fullyDecentralized.title}</h3>
                  <p className="text-sm text-muted-foreground">{arch.decentralized.fullyDecentralized.subtitle}</p>
                </div>
              </div>
              <div className="space-y-3">
                {arch.decentralized.fullyDecentralized.items.map((item, i) => (
                  <div key={i} className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-foreground">{item.what}</span>
                      <span className="text-sm text-primary font-mono">{item.how}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Server as Helper */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Server className="text-amber-600" size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{arch.decentralized.serverAsHelper.title}</h3>
                  <p className="text-sm text-muted-foreground">{arch.decentralized.serverAsHelper.subtitle}</p>
                </div>
              </div>
              <div className="space-y-3">
                {arch.decentralized.serverAsHelper.items.map((item, i) => (
                  <div key={i} className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-foreground">{item.what}</span>
                      <span className="text-sm text-muted-foreground">— {item.description}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{item.why}</p>
                    <div className="flex flex-col sm:flex-row gap-2 text-xs">
                      <span className="bg-green-500/10 text-green-600 px-2 py-1 rounded">
                        <Lock size={12} className="inline mr-1" />
                        {item.protection}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                      <ChevronRight size={12} />
                      {item.roadmap}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Planned */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center border border-border">
                  <Clock className="text-muted-foreground" size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{arch.decentralized.planned.title}</h3>
                  <p className="text-sm text-muted-foreground">{arch.decentralized.planned.subtitle}</p>
                </div>
              </div>
              <div className="space-y-3">
                {arch.decentralized.planned.items.map((item, i) => (
                  <div key={i} className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-foreground">{item.what}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status.includes('NLNet') || item.status.includes('Finanziert') || item.status.includes('Funded')
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.goal}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Server Protection */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <h2 className="text-2xl font-bold text-foreground mb-4">{arch.serverProtection.title}</h2>
          <p className="text-lg text-muted-foreground italic mb-2">{arch.serverProtection.question}</p>
          <p className="text-lg text-foreground font-medium mb-8">{arch.serverProtection.answer}</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {arch.serverProtection.reasons.map((reason, i) => {
              const Icon = protectionIcons[i]
              return (
                <Card key={i} className="px-5 gap-0">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="text-primary" size={16} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-1">{reason.title}</h4>
                      <p className="text-sm text-muted-foreground">{reason.description}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Comparison */}
          <div className="bg-foreground rounded-2xl p-6 md:p-8 text-background">
            <h3 className="text-lg font-bold mb-4">{arch.serverProtection.comparison.title}</h3>
            <div className="space-y-3">
              {arch.serverProtection.comparison.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-baseline">
                  <span className={`font-mono text-sm font-bold shrink-0 w-28 ${
                    item.name === 'Web of Trust' ? 'text-primary' : 'text-background/50'
                  }`}>
                    {item.name}
                  </span>
                  <span className={`text-sm ${
                    item.name === 'Web of Trust' ? 'text-background' : 'text-background/70'
                  }`}>
                    {item.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="bg-muted py-16 mb-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-10">{arch.roadmap.title}</h2>

            {/* Phase Headers */}
            <div className="hidden md:grid grid-cols-[180px_1fr_1fr_1fr] gap-4 mb-4">
              <div />
              {['today', 'tomorrow', 'vision'].map((phase) => (
                <div key={phase} className="text-center">
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {arch.roadmap.phases[phase]}
                  </span>
                </div>
              ))}
            </div>

            {/* Categories */}
            <div className="space-y-3">
              {arch.roadmap.categories.map((cat, i) => (
                <div key={i} className="bg-background rounded-lg border border-border overflow-hidden">
                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[180px_1fr_1fr_1fr] gap-4 p-4 items-center">
                    <span className="font-medium text-foreground">{cat.name}</span>
                    {['today', 'tomorrow', 'vision'].map((phase) => {
                      const cell = cat[phase]
                      const colors = statusColors[cell.status]
                      return (
                        <div key={phase} className="text-center">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg}`}>
                            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                            <span className={`text-sm font-medium ${colors.text}`}>{cell.label}</span>
                          </div>
                          {cell.detail && (
                            <p className="text-xs text-muted-foreground mt-1">{cell.detail}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden p-4">
                    <span className="font-medium text-foreground block mb-3">{cat.name}</span>
                    <div className="space-y-2">
                      {['today', 'tomorrow', 'vision'].map((phase) => {
                        const cell = cat[phase]
                        const colors = statusColors[cell.status]
                        return (
                          <div key={phase} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-16 shrink-0">
                              {arch.roadmap.phases[phase]}
                            </span>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${colors.bg}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                              <span className={`text-xs font-medium ${colors.text}`}>{cell.label}</span>
                            </div>
                            {cell.detail && (
                              <span className="text-xs text-muted-foreground">{cell.detail}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6">
              {Object.entries(arch.roadmap.legend).map(([key, label]) => {
                const colors = statusColors[key]
                return (
                  <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    {label}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Tech Badges */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="flex flex-wrap gap-2 justify-center">
            {arch.techBadges.map((badge, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-muted text-muted-foreground text-sm font-mono rounded-full border border-border"
              >
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* Architecture FAQ */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-8">{arch.faq.title}</h2>
          <Card className="px-6 gap-0">
            {arch.faq.items.map((item, i) => (
              <div key={i} className="border-b border-border last:border-b-0">
                <button
                  className="w-full py-5 flex items-center justify-between text-left"
                  onClick={() => setOpenFaq(prev => ({ ...prev, [i]: !prev[i] }))}
                >
                  <span className="font-medium text-foreground pr-4">{item.q}</span>
                  {openFaq[i] ? (
                    <ChevronUp className="shrink-0 text-primary" size={20} />
                  ) : (
                    <ChevronDown className="shrink-0 text-muted-foreground" size={20} />
                  )}
                </button>
                {openFaq[i] && (
                  <div className="pb-5 pr-8">
                    <p className="text-muted-foreground">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  )
}
