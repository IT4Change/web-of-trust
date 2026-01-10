import { UserCheck, Share2, Award, ArrowRight } from 'lucide-react'
import { Card } from '@real-life-stack/toolkit'

const problems = [
  { before: 'Social Media bindet Aufmerksamkeit', after: 'Im echten Leben verbinden' },
  { before: 'Deine Daten liegen bei Konzernen', after: 'Deine Daten liegen bei dir' },
  { before: 'Vertrauen durch Likes und Sterne', after: 'Vertrauen durch echte Begegnungen' },
  { before: 'Account-Erstellung alleine am Bildschirm', after: 'Onboarding durch Freunde in einer Kette' },
  { before: 'Abhängig von Servern und Empfang', after: 'Funktioniert auch ohne Internet' },
]

const pillars = [
  {
    icon: UserCheck,
    title: 'Verifizieren',
    description: 'Identität durch persönliches Treffen bestätigen',
    color: 'primary',
    detail: 'Jede Beziehung beginnt mit einer echten Begegnung. Durch QR-Code-Scan bestätigst du: "Das ist wirklich diese Person."'
  },
  {
    icon: Share2,
    title: 'Kooperieren',
    description: 'Verschlüsselte Inhalte teilen',
    color: 'secondary',
    detail: 'Teile Kalender, Orte und Projekte mit deinem Netzwerk. Alles Ende-zu-Ende verschlüsselt.'
  },
  {
    icon: Award,
    title: 'Attestieren',
    description: 'Reputation durch echte Taten aufbauen',
    color: 'accent',
    detail: 'Bestätige was andere getan haben. Diese Attestationen bauen über Zeit sichtbares Vertrauen auf.'
  },
]

const colorClasses = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
    gradient: 'from-primary to-primary/80',
  },
  secondary: {
    bg: 'bg-secondary/10',
    text: 'text-secondary',
    border: 'border-secondary/20',
    gradient: 'from-secondary to-secondary/80',
  },
  accent: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    gradient: 'from-warning to-warning/80',
  },
}

export default function ProblemSolution() {
  return (
    <section id="konzept" className="py-16 md:py-24 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Ein anderer Ansatz
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Wir setzen auf lokale Gemeinschaften statt globaler Plattformen.
            Statt Algorithmen bauen wir auf echte Begegnungen.
          </p>
        </div>

        {/* Problem/Solution Comparison */}
        <div className="mb-20">
          <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="text-center md:text-right">
              <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider mb-4">Heute</h3>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">Besser</h3>
            </div>
          </div>

          <div className="space-y-3 max-w-4xl mx-auto">
            {problems.map((item, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 items-center">
                <div className="bg-muted rounded-lg p-3 md:p-4 text-center md:text-right">
                  <span className="text-muted-foreground text-sm md:text-base">{item.before}</span>
                </div>
                <div className="bg-secondary/5 rounded-lg p-3 md:p-4 text-center md:text-left border border-secondary/20">
                  <span className="text-secondary font-medium text-sm md:text-base">{item.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three Pillars */}
        <div className="mb-12">
          <h3 className="text-xl md:text-2xl font-semibold text-center text-foreground mb-12">
            Die drei Säulen
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            {pillars.map((pillar, index) => {
              const colors = colorClasses[pillar.color]
              const Icon = pillar.icon

              return (
                <div key={index} className="relative">
                  {/* Connector Arrow (except last) */}
                  {index < pillars.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -translate-y-1/2 -right-4 translate-x-1/2 z-10">
                      <ArrowRight className="text-muted-foreground/30" size={24} />
                    </div>
                  )}

                  <Card className={`px-6 gap-0 ${colors.border} h-full`}>
                    <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className={colors.text} size={28} />
                    </div>
                    <h4 className="text-xl font-semibold text-foreground mb-2">
                      {pillar.title}
                    </h4>
                    <p className={`${colors.text} font-medium mb-3`}>
                      {pillar.description}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {pillar.detail}
                    </p>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>

        {/* Important Note */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
            <h4 className="font-semibold text-primary mb-2">
              Verifizieren ≠ Vertrauen
            </h4>
            <p className="text-primary/80">
              Die Verifizierung bestätigt nur: "Das ist wirklich diese Person."
              Das eigentliche Vertrauen entsteht durch Attestationen über Zeit.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
