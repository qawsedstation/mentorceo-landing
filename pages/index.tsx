import Head from 'next/head';
import Link from 'next/link';

const TESTIMONIALS = [
  { name: 'Marcus T.', handle: 'marcus_ceo', stars: 5, text: "I've read every startup book. Nothing stuck like this. After 3 weeks my close rate went from 22% to 41%. The scenarios are frighteningly realistic." },
  { name: 'Priya S.', handle: 'priya.builds', stars: 5, text: "Didn't expect to get hooked this fast. I keep finding myself thinking about the scenarios hours later. Worth every penny." },
  { name: 'James R.', handle: 'jamesr_founder', stars: 5, text: "5 minutes a day and I've completely changed how I think about pricing. My SaaS went from $8k to $22k MRR in 6 weeks." },
];

const FEATURES = [
  { icon: '🧠', title: 'Learn from real CEOs', desc: 'Alex Hormozi, Naval Ravikant, Paul Graham and 10+ other mentors teach you their exact frameworks' },
  { icon: '⚡', title: '5-min daily sessions', desc: 'Spaced repetition and adaptive difficulty — your brain remembers what others forget' },
  { icon: '🎯', title: 'Personalised to your business', desc: 'SaaS? Agency? E-commerce? The AI tailors every lesson to your exact situation' },
  { icon: '🏆', title: 'Scenarios & challenges', desc: 'Hypothetical high-stakes scenarios. Make the call — then see what the best CEOs actually did' },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>MentorCEO — Train Your Mind Like a CEO</title>
        <meta name="description" content="Learn from Alex Hormozi, Naval Ravikant, Paul Graham and 10+ world-class mentors. 5 minutes a day. Personalised to your business." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <span className="font-bold text-xl text-navy" style={{ color: '#0F172A' }}>MentorCEO</span>
          </div>
          <Link
            href="/quiz"
            className="bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors"
            style={{ backgroundColor: '#1E4EFF' }}
          >
            Start Free →
          </Link>
        </nav>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ color: '#1E4EFF' }}>
            <span>⭐</span> Trusted by 10,000+ founders worldwide
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Train your mind<br />
            <span style={{ color: '#1E4EFF' }}>like a CEO.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Learn from Alex Hormozi, Naval Ravikant, Paul Graham and 10+ world-class mentors.
            5 minutes a day. AI-personalised to your exact business.
          </p>
          <Link
            href="/quiz"
            className="inline-block text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: '#1E4EFF' }}
          >
            Get My Personalised Plan →
          </Link>
          <p className="text-sm text-gray-400 mt-4">Takes 2 minutes · No credit card needed</p>

          {/* Social proof pills */}
          <div className="flex items-center justify-center gap-4 mt-10 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-full text-sm text-gray-600">
              🌍 10,000+ founders
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-full text-sm text-gray-600">
              ⭐ 4.9 average rating
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-full text-sm text-gray-600">
              📈 89% report better decisions
            </div>
          </div>
        </section>

        {/* Mentor section */}
        <section className="py-16" style={{ background: '#0F172A' }}>
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-center mb-10" style={{ color: '#4B5563' }}>Learn from the minds behind</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { initials: 'AH', name: 'Alex Hormozi', role: 'Sales & Scaling', color: '#1E4EFF' },
                { initials: 'NR', name: 'Naval Ravikant', role: 'Investing & Wealth', color: '#7C3AED' },
                { initials: 'PG', name: 'Paul Graham', role: 'Startups & Product', color: '#059669' },
                { initials: 'GV', name: 'Gary Vaynerchuk', role: 'Marketing & Brand', color: '#DC2626' },
                { initials: 'JL', name: 'Jason Lemkin', role: 'SaaS Growth', color: '#D97706' },
                { initials: 'AD', name: 'April Dunford', role: 'Positioning', color: '#0284C7' },
              ].map(m => (
                <div key={m.initials} className="flex flex-col items-center text-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: m.color, opacity: 0.9 }}>
                    {m.initials}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm leading-tight">{m.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything you need to think like a CEO</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {FEATURES.map(f => (
              <div key={f.title} className="flex gap-4 p-6 bg-gray-50 rounded-2xl">
                <span className="text-3xl flex-shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 py-20">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Build your profile', desc: 'Answer a few questions about your business, goals, and learning style. Takes 2 minutes.' },
                { step: '02', title: 'Get your CEO plan', desc: 'We build a personalised curriculum matching your exact business stage and challenges.' },
                { step: '03', title: 'Level up daily', desc: '5-minute sessions with real scenarios, mentor wisdom, and spaced repetition that sticks.' },
              ].map(s => (
                <div key={s.step} className="text-center">
                  <div className="text-5xl font-black mb-4" style={{ color: '#1E4EFF', opacity: 0.2 }}>{s.step}</div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Founders who think like CEOs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.handle} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-400">@{t.handle}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center" style={{ background: '#0F172A' }}>
          <div className="max-w-2xl mx-auto px-6">
            <div className="text-5xl mb-6">👑</div>
            <h2 className="text-3xl font-bold text-white mb-4">Ready to think like a CEO?</h2>
            <p className="text-gray-400 mb-8">Join 10,000+ founders training their minds daily.</p>
            <Link
              href="/quiz"
              className="inline-block text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: '#1E4EFF' }}
            >
              Build My CEO Profile →
            </Link>
            <p className="text-sm text-gray-500 mt-4">Free personalisation · 30-day money-back guarantee</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-8">
          <div className="max-w-5xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span>👑</span>
              <span className="font-bold text-gray-700">MentorCEO</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-gray-600">Privacy</a>
              <a href="/terms" className="hover:text-gray-600">Terms</a>
              <a href="mailto:hello@mentorceo.io" className="hover:text-gray-600">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
