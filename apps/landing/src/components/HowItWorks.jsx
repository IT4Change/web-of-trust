import { QrCode, Eye, BadgeCheck, CheckCircle2 } from 'lucide-react'
import { Card } from '@real-life-stack/toolkit'
import { useLanguage } from '../i18n/LanguageContext'

const colorClasses = {
  primary: {
    bg: 'bg-primary',
    light: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary',
  },
  secondary: {
    bg: 'bg-secondary',
    light: 'bg-secondary/10',
    text: 'text-secondary',
    border: 'border-secondary',
  },
  accent: {
    bg: 'bg-warning',
    light: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning',
  },
}

export default function HowItWorks() {
  const { t } = useLanguage()

  const steps = [
    {
      number: '01',
      icon: QrCode,
      title: t.howItWorks.steps[0].title,
      description: t.howItWorks.steps[0].description,
      detail: t.howItWorks.steps[0].detail,
      color: 'primary',
    },
    {
      number: '02',
      icon: CheckCircle2,
      title: t.howItWorks.steps[1].title,
      description: t.howItWorks.steps[1].description,
      detail: t.howItWorks.steps[1].detail,
      color: 'primary',
    },
    {
      number: '03',
      icon: Eye,
      title: t.howItWorks.steps[2].title,
      description: t.howItWorks.steps[2].description,
      detail: t.howItWorks.steps[2].detail,
      color: 'secondary',
    },
    {
      number: '04',
      icon: BadgeCheck,
      title: t.howItWorks.steps[3].title,
      description: t.howItWorks.steps[3].description,
      detail: t.howItWorks.steps[3].detail,
      color: 'accent',
    },
  ]

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            {t.howItWorks.title}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t.howItWorks.subtitle}
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
              {steps.map((step, index) => {
                const colors = colorClasses[step.color]
                const Icon = step.icon
                const isEven = index % 2 === 0

                return (
                  <div key={index} className="relative pt-8">
                    {/* Icon überlappt die Karte */}
                    <div className={`absolute top-0 md:left-4 ${isEven ? 'left-4' : 'right-4'} z-10`}>
                      <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg`}>
                        <Icon size={32} />
                      </div>
                    </div>

                    <Card className="px-6 gap-0 pt-14!">
                      <span className={`text-sm font-bold ${colors.text}`}>
                        {t.howItWorks.step} {step.number}
                      </span>
                      <h3 className="text-xl font-semibold text-foreground mt-1 mb-3">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground mb-3">
                        {step.description}
                      </p>
                      <p className="text-sm text-muted-foreground/70 border-t border-border pt-3">
                        {step.detail}
                      </p>
                    </Card>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Result Box */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-primary-foreground text-center">
            <h3 className="text-2xl font-bold mb-3">
              {t.howItWorks.result.title}
            </h3>
            <p className="text-primary-foreground/80">
              {t.howItWorks.result.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
