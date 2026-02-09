import Header from '../components/Header'
import Hero from '../components/Hero'
import AudienceShowcase from '../components/AudienceShowcase'
import ProblemSolution from '../components/ProblemSolution'
import HowItWorks from '../components/HowItWorks'
import Apps from '../components/Apps'
import Personas from '../components/Personas'
import Principles from '../components/Principles'
import FAQ from '../components/FAQ'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <AudienceShowcase />
        <ProblemSolution />
        <HowItWorks />
        <Apps />
        <Personas />
        <Principles />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
