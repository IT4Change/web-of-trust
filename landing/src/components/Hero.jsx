import { ArrowDown, Users, Shield, Sparkles, Plane } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
        <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="#cbd5e1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Floating Connection Lines */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 opacity-20">
          <svg viewBox="0 0 200 200" className="w-full h-full text-primary-400">
            <circle cx="50" cy="50" r="8" fill="currentColor" />
            <circle cx="150" cy="50" r="8" fill="currentColor" />
            <circle cx="100" cy="150" r="8" fill="currentColor" />
            <line x1="50" y1="50" x2="150" y2="50" stroke="currentColor" strokeWidth="2" />
            <line x1="50" y1="50" x2="100" y2="150" stroke="currentColor" strokeWidth="2" />
            <line x1="150" y1="50" x2="100" y2="150" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 opacity-20">
          <svg viewBox="0 0 200 200" className="w-full h-full text-secondary-400">
            <circle cx="50" cy="100" r="8" fill="currentColor" />
            <circle cx="150" cy="100" r="8" fill="currentColor" />
            <circle cx="100" cy="50" r="8" fill="currentColor" />
            <circle cx="100" cy="150" r="8" fill="currentColor" />
            <line x1="50" y1="100" x2="150" y2="100" stroke="currentColor" strokeWidth="2" />
            <line x1="100" y1="50" x2="100" y2="150" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <div className="section-container">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-8">
            <Sparkles size={16} />
            <span>Open Source Forschungsprojekt</span>
          </div>

          {/* Main Headline */}
          <h1 className="heading-1 text-slate-900 mb-6">
            Vertrauen entsteht durch{' '}
            <span className="text-primary-600">echte Begegnungen</span>
          </h1>

          {/* Subheadline */}
          <p className="text-body max-w-2xl mx-auto mb-10">
            Ein dezentrales Vertrauensnetzwerk für lokale Gemeinschaften.
            Menschen vernetzen sich basierend auf echten Begegnungen statt Algorithmen.
            Deine Daten bleiben bei dir.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="#konzept" className="btn-primary">
              Mehr erfahren
            </a>
            <a
              href="https://github.com/antontranelis/web-of-trust-concept"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Auf GitHub ansehen
            </a>
          </div>

          {/* Key Points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Users size={20} className="text-primary-600" />
              </div>
              <span className="font-medium">Persönliche Verifizierung</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center">
                <Shield size={20} className="text-secondary-600" />
              </div>
              <span className="font-medium">Ende-zu-Ende verschlüsselt</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-600" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849m.894.448C7.111 2.02 7 2.569 7 3v4a.5.5 0 0 1-.276.447l-5.448 2.724a.5.5 0 0 0-.276.447v.792l5.418-.903a.5.5 0 0 1 .575.41l.5 3a.5.5 0 0 1-.14.437L6.708 15h2.586l-.647-.646a.5.5 0 0 1-.14-.436l.5-3a.5.5 0 0 1 .576-.411L15 11.41v-.792a.5.5 0 0 0-.276-.447L9.276 7.447A.5.5 0 0 1 9 7V3c0-.432-.11-.979-.322-1.401C8.458 1.159 8.213 1 8 1s-.458.158-.678.599" />
                </svg>
              </div>
              <span className="font-medium">Funktioniert offline</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <a href="#konzept" className="text-slate-400 hover:text-primary-600 transition-colors">
            <ArrowDown size={24} />
          </a>
        </div>
      </div>
    </section>
  )
}
