import { Lock, Users, WifiOff, Github, Ban, Database, Key, RefreshCw } from 'lucide-react'
import { Card } from '@real-life-stack/toolkit'

const principles = [
  {
    icon: Lock,
    title: 'Daten bei dir',
    description: 'Alle deine Daten liegen verschlüsselt auf deinem Gerät. Nur Leute die du verifiziert hast können sie entschlüsseln.',
    color: 'primary',
  },
  {
    icon: Users,
    title: 'Echte Begegnungen',
    description: 'Jede Beziehung im Netzwerk basiert auf einer persönlichen Begegnung. Das verhindert Fake-Accounts und Spam.',
    color: 'secondary',
  },
  {
    icon: WifiOff,
    title: 'Funktioniert offline',
    description: 'Content erstellen, Leute verifizieren, Attestationen vergeben - alles geht auch ohne Internet. Sync erfolgt später.',
    color: 'accent',
  },
  {
    icon: Github,
    title: 'Open Source',
    description: 'Der gesamte Code ist öffentlich. Du kannst prüfen wie es funktioniert und sogar selbst beitragen.',
    color: 'slate',
  },
  {
    icon: Key,
    title: 'Du hast den Schlüssel',
    description: 'Deine kryptographische Identität gehört dir. Mit der Recovery-Phrase kannst du sie jederzeit wiederherstellen.',
    color: 'primary',
  },
  {
    icon: Database,
    title: 'Daten exportierbar',
    description: 'Kein Vendor-Lock-in. Du kannst alle deine Daten jederzeit exportieren und mitnehmen.',
    color: 'secondary',
  },
]

const notFeatures = [
  { icon: Ban, text: 'Kein Social Media zum Scrollen' },
  { icon: Ban, text: 'Keine Werbung oder Tracking' },
  { icon: Ban, text: 'Keine Algorithmen die entscheiden was du siehst' },
  { icon: Ban, text: 'Keine Blockchain oder Crypto-Token' },
]

const colorClasses = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
  },
  secondary: {
    bg: 'bg-secondary/10',
    text: 'text-secondary',
  },
  accent: {
    bg: 'bg-warning/10',
    text: 'text-warning',
  },
  slate: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  },
}

export default function Principles() {
  return (
    <section className="py-16 md:py-24 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Unsere Prinzipien
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Was das Web of Trust ausmacht - und was es bewusst nicht ist.
          </p>
        </div>

        {/* Principles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {principles.map((principle, index) => {
            const colors = colorClasses[principle.color]
            const Icon = principle.icon

            return (
              <Card key={index} className="px-6 gap-0">
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={colors.text} size={24} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {principle.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {principle.description}
                </p>
              </Card>
            )
          })}
        </div>

        {/* What It's Not */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-foreground rounded-2xl p-8 text-background">
            <h3 className="text-xl font-bold mb-6 text-center">
              Was Web of Trust <span className="text-destructive">nicht</span> ist
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {notFeatures.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={index} className="flex items-center gap-3">
                    <Icon className="text-destructive flex-shrink-0" size={20} />
                    <span className="text-background/70">{item.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <RefreshCw size={16} />
            <span className="text-sm">
              Dies ist ein Forschungsprojekt - wir lernen und verbessern kontinuierlich
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
