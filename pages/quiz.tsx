import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rest-dash.happierleads.com';
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// ─── Types ───────────────────────────────────────────────────────────────────

type QuizStep = 'stage' | 'personality' | 'focus' | 'revenue' | 'daily_time' | 'challenge' | 'projection' | 'loading' | 'result' | 'social' | 'email' | 'pricing';
type Step = QuizStep | 'success';

interface QuizState {
  stage: string;
  personality: string;
  focus: string[];
  revenue: string;
  dailyTime: string;
  challenge: string;
  riskTaker: boolean | null;
  email: string;
  selectedPlan: string;
}

const PLANS = [
  {
    id: 'price_1TYAegGB9TSabx4W9WMHhIkf',
    label: '1 month',
    originalPrice: '$22.99',
    price: '$11.49',
    perDay: '$0.38',
    save: 'SAVE 50%',
    billedAs: '$11.49/month',
    popular: false,
  },
  {
    id: 'price_1TYAegGB9TSabx4WeXtH9gE2',
    label: '3 months',
    originalPrice: '$49.95',
    price: '$19.99',
    perDay: '$0.22',
    save: 'SAVE 60%',
    billedAs: '$19.99 every 3 months',
    popular: true,
  },
  {
    id: 'price_1TYAegGB9TSabx4WPDoCwjxx',
    label: '1 year',
    originalPrice: '$99.99',
    price: '$47.99',
    perDay: '$0.13',
    save: 'SAVE 52%',
    billedAs: '$47.99/year',
    popular: false,
  },
];

const MENTORS = [
  { id: 'alex-hormozi', name: 'Alex Hormozi', img: 'https://unavatar.io/twitter/AlexHormozi' },
  { id: 'gary-vee', name: 'Gary Vaynerchuk', img: 'https://unavatar.io/twitter/garyvee' },
  { id: 'naval', name: 'Naval Ravikant', img: 'https://unavatar.io/twitter/naval' },
  { id: 'paul-graham', name: 'Paul Graham', img: 'https://unavatar.io/twitter/paulg' },
  { id: 'jeff-bezos', name: 'Jeff Bezos', img: 'https://unavatar.io/twitter/JeffBezos' },
  { id: 'steve-jobs', name: 'Steve Jobs', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/200px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg' },
  { id: 'oprah', name: 'Oprah Winfrey', img: 'https://unavatar.io/twitter/Oprah' },
  { id: 'warren-buffett', name: 'Warren Buffett', img: 'https://unavatar.io/twitter/WarrenBuffett' },
  { id: 'grant-cardone', name: 'Grant Cardone', img: 'https://unavatar.io/twitter/GrantCardone' },
];

const FOCUS_OPTIONS = [
  { id: 'sales', icon: '💰', label: 'Sales & Revenue' },
  { id: 'marketing', icon: '📣', label: 'Marketing & Brand' },
  { id: 'strategy', icon: '♟️', label: 'Strategy & Vision' },
  { id: 'mindset', icon: '🧠', label: 'Leadership & Mindset' },
  { id: 'product', icon: '💻', label: 'Product & Innovation' },
  { id: 'finance', icon: '💵', label: 'Fundraising & Finance' },
];

const STEP_ORDER: QuizStep[] = [
  'stage', 'personality', 'focus', 'revenue', 'daily_time', 'challenge',
  'projection', 'loading', 'result', 'social', 'email', 'pricing',
];

const TOTAL_STEPS = STEP_ORDER.length;

const STEP_LABELS: Partial<Record<QuizStep, string>> = {
  stage: 'PROFILE',
  personality: 'PERSONALITY',
  focus: 'FOCUS',
  revenue: 'REVENUE',
  daily_time: 'COMMITMENT',
  challenge: 'CHALLENGE',
  projection: 'YOUR PLAN',
  loading: 'ANALYSING',
  result: 'YOUR PROFILE',
  social: 'COMMUNITY',
  email: 'SAVE PROFILE',
  pricing: 'GET ACCESS',
};

// ─── Radar Chart ─────────────────────────────────────────────────────────────

function RadarChart({ values }: { values: number[] }) {
  const labels = ['DECISIVE', 'STRATEGIC', 'RISK-TAKER', 'GROWTH\nFOCUSED', 'RESILIENT', 'VISIONARY'];
  const cx = 120, cy = 120, r = 90;
  const n = labels.length;

  const points = (vals: number[]) =>
    vals.map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [cx + (v / 10) * r * Math.cos(angle), cy + (v / 10) * r * Math.sin(angle)];
    });

  const gridPoints = (level: number) =>
    Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return `${cx + level * r * Math.cos(angle)},${cy + level * r * Math.sin(angle)}`;
    }).join(' ');

  const valuePoints = points(values).map(p => p.join(',')).join(' ');
  const labelPositions = Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + 1.18 * r * Math.cos(angle), y: cy + 1.18 * r * Math.sin(angle) };
  });

  return (
    <svg viewBox="0 0 240 240" width="240" height="240">
      {[0.2, 0.4, 0.6, 0.8, 1].map(l => (
        <polygon key={l} points={gridPoints(l)} fill={l === 0.2 ? '#f0f4ff' : 'none'} stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      <polygon points={valuePoints} fill="rgba(30,78,255,0.15)" stroke="#1E4EFF" strokeWidth="2.5" />
      {points(values).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#1E4EFF" />)}
      {labelPositions.map((pos, i) => (
        <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
          fill="#6b7280" fontSize="8" fontWeight="600" fontFamily="system-ui">
          {labels[i]}
        </text>
      ))}
    </svg>
  );
}

// ─── Stripe Payment Form ──────────────────────────────────────────────────────

function StripePaymentForm({ clientSecret, onSuccess, plan }: {
  clientSecret: string;
  onSuccess: () => void;
  plan: typeof PLANS[0];
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/success` },
        redirect: 'if_required',
      });
      if (error) {
        toast.error(error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all disabled:opacity-60"
        style={{ backgroundColor: '#1E4EFF' }}
      >
        {paying ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing…
          </span>
        ) : `Pay ${plan.price} — Start Training`}
      </button>
    </form>
  );
}

// ─── Main Quiz Component ──────────────────────────────────────────────────────

export default function Quiz() {
  const [step, setStep] = useState<Step>('stage');
  const [state, setState] = useState<QuizState>({
    stage: '', personality: '', focus: [], revenue: '',
    dailyTime: '', challenge: '', riskTaker: null, email: '', selectedPlan: PLANS[1].id,
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showRiskPopup, setShowRiskPopup] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise] = useState(() => loadStripe(STRIPE_PK));
  const [promoSecondsLeft, setPromoSecondsLeft] = useState(10 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const promoCode = `ceo_${currentMonth.toLowerCase()}_${new Date().getDate()}`;

  // Promo countdown
  useEffect(() => {
    if (step !== 'pricing') return;
    timerRef.current = setInterval(() => {
      setPromoSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const promoMins = String(Math.floor(promoSecondsLeft / 60)).padStart(2, '0');
  const promoSecs = String(promoSecondsLeft % 60).padStart(2, '0');

  // Loading animation
  useEffect(() => {
    if (step !== 'loading') return;
    setLoadingProgress(0);
    setShowRiskPopup(false);
    let p = 0;
    const interval = setInterval(() => {
      p += 1.5;
      setLoadingProgress(Math.min(p, 100));
      if (p >= 45 && !showRiskPopup) setShowRiskPopup(true);
      if (p >= 100) { clearInterval(interval); }
    }, 80);
    return () => clearInterval(interval);
  }, [step]);

  const stepIndex = STEP_ORDER.indexOf(step as QuizStep);
  const progressPct = stepIndex >= 0 ? ((stepIndex + 1) / TOTAL_STEPS) * 100 : 100;

  const set = (key: keyof QuizState, value: any) =>
    setState(prev => ({ ...prev, [key]: value }));

  const next = (nextStep?: Step) => {
    const idx = STEP_ORDER.indexOf(step as QuizStep);
    setStep(nextStep || STEP_ORDER[idx + 1] || 'pricing');
  };

  const back = () => {
    const idx = STEP_ORDER.indexOf(step as QuizStep);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const radarValues = [
    state.riskTaker ? 8 : 5,
    state.focus.includes('strategy') ? 8 : 5,
    state.riskTaker ? 7 : 4,
    state.focus.includes('sales') ? 8 : 5,
    state.stage === 'scaling' ? 8 : 5,
    state.personality ? 7 : 5,
  ];

  const createSubscription = async () => {
    const plan = PLANS.find(p => p.id === state.selectedPlan)!;
    const res = await fetch(`${API}/mentorceo/create-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: state.email, priceId: state.selectedPlan }),
    });
    const data = await res.json();
    if (data.clientSecret) setClientSecret(data.clientSecret);
    else toast.error('Could not start payment. Try again.');
  };

  const handleEmailContinue = async () => {
    if (!state.email || !state.email.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    next('pricing');
    createSubscription();
  };

  const handlePaySuccess = () => next('success');

  // ── RENDERING ────────────────────────────────────────────────────────────

  if (step === 'success') {
    return <SuccessPage email={state.email} />;
  }

  return (
    <>
      <Head>
        <title>Build Your CEO Profile — MentorCEO</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-4">
            {stepIndex > 0 && step !== 'loading' && step !== 'result' && (
              <button onClick={back} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 flex-shrink-0">
                ← Back
              </button>
            )}
            <Link href="/" className="flex items-center gap-1.5 mx-auto">
              <span className="text-xl">👑</span>
              <span className="font-bold text-gray-900">MentorCEO</span>
            </Link>
          </div>
          {/* Progress dots */}
          {(STEP_ORDER as string[]).includes(step) && (
            <div className="max-w-lg mx-auto px-8 pb-3">
              <div className="flex items-center gap-1">
                {STEP_ORDER.slice(0, 8).map((s, i) => (
                  <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: '#1E4EFF',
                        width: i < stepIndex ? '100%' : i === stepIndex ? '60%' : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>
              {STEP_LABELS[step] && (
                <p className="text-center text-xs font-semibold mt-2" style={{ color: '#1E4EFF' }}>
                  {STEP_LABELS[step]}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="max-w-lg mx-auto px-4 py-8 pb-24">

          {/* ── STEP: STAGE ─────────────────────────────────────────────── */}
          {step === 'stage' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                Where are you in your business journey?
              </h1>
              <p className="text-gray-500 text-center text-sm mb-8">We personalise everything to your stage</p>
              <div className="space-y-3">
                {[
                  { id: 'idea', icon: '🌱', label: 'Just getting started', sub: 'Idea or pre-revenue stage' },
                  { id: 'early', icon: '📈', label: 'Early traction', sub: 'First customers, building momentum' },
                  { id: 'growing', icon: '🚀', label: 'Growing fast', sub: 'Revenue, team, scaling challenges' },
                  { id: 'scaling', icon: '🏆', label: 'Scaling up', sub: 'Established business, optimising everything' },
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => { set('stage', o.id); next('personality'); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left hover:border-blue-300 transition-all"
                    style={{ borderColor: state.stage === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.stage === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <span className="text-3xl">{o.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-xs text-gray-400">{o.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: PERSONALITY ───────────────────────────────────────── */}
          {step === 'personality' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                Which business leader do you respect most?
              </h1>
              <p className="text-gray-500 text-center text-sm mb-8">They all think differently</p>
              <div className="grid grid-cols-3 gap-4">
                {MENTORS.map(m => {
                  const sel = state.personality === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { set('personality', m.id); next('focus'); }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all hover:border-blue-300"
                      style={{ borderColor: sel ? '#1E4EFF' : '#e5e7eb', backgroundColor: sel ? '#f0f4ff' : 'white' }}
                    >
                      <img
                        src={m.img}
                        alt={m.name}
                        className="rounded-full object-cover transition-all"
                        style={{ width: 72, height: 72, filter: sel ? 'none' : 'grayscale(100%)' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1E4EFF&color=fff`; }}
                      />
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{m.name}</span>
                      {sel && <span className="text-xs font-bold" style={{ color: '#1E4EFF' }}>✓ Selected</span>}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => next('focus')} className="mt-6 w-full py-3.5 rounded-2xl font-semibold text-white" style={{ backgroundColor: '#1E4EFF' }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP: FOCUS ─────────────────────────────────────────────── */}
          {step === 'focus' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                What do you most want to improve?
              </h1>
              <p className="text-gray-500 text-center text-sm mb-8">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_OPTIONS.map(o => {
                  const sel = state.focus.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => set('focus', sel ? state.focus.filter(f => f !== o.id) : [...state.focus, o.id])}
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all"
                      style={{ borderColor: sel ? '#1E4EFF' : '#e5e7eb', backgroundColor: sel ? '#f0f4ff' : 'white' }}
                    >
                      <span className="text-2xl">{o.icon}</span>
                      <span className="font-medium text-gray-800 text-sm">{o.label}</span>
                      {sel && <span className="ml-auto text-sm" style={{ color: '#1E4EFF' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => next('revenue')}
                disabled={state.focus.length === 0}
                className="mt-6 w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: '#1E4EFF' }}
              >
                Continue ({state.focus.length} selected) →
              </button>
            </div>
          )}

          {/* ── STEP: REVENUE ───────────────────────────────────────────── */}
          {step === 'revenue' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                What&apos;s your current monthly revenue?
              </h1>
              <p className="text-gray-500 text-center text-sm mb-8">Helps us match content to your stage</p>
              <div className="space-y-3">
                {[
                  { id: 'none', label: 'No revenue yet', sub: 'Building and validating' },
                  { id: 'under5k', label: 'Under $5K/month', sub: 'Early traction' },
                  { id: '5k-50k', label: '$5K – $50K/month', sub: 'Growing' },
                  { id: '50k+', label: '$50K+/month', sub: 'Scaling' },
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => { set('revenue', o.id); next('daily_time'); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border-2 text-left hover:border-blue-300 transition-all"
                    style={{ borderColor: state.revenue === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.revenue === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-xs text-gray-400">{o.sub}</div>
                    </div>
                    {state.revenue === o.id && <span style={{ color: '#1E4EFF' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: DAILY TIME ────────────────────────────────────────── */}
          {step === 'daily_time' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                How much time can you commit daily?
              </h1>
              <p className="text-gray-500 text-center text-sm mb-8">Even 5 minutes a day compounds massively</p>
              <div className="space-y-3">
                {[
                  { id: '5min', icon: '⚡', label: '5 minutes', sub: 'Quick daily habit' },
                  { id: '10min', icon: '📚', label: '10 minutes', sub: 'Steady progress' },
                  { id: '15min', icon: '🎯', label: '15 minutes', sub: 'Serious learner' },
                  { id: '30min+', icon: '💪', label: '30+ minutes', sub: 'Full commitment mode' },
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => { set('dailyTime', o.id); next('challenge'); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left hover:border-blue-300 transition-all"
                    style={{ borderColor: state.dailyTime === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.dailyTime === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <span className="text-2xl">{o.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-xs text-gray-400">{o.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: CHALLENGE ─────────────────────────────────────────── */}
          {step === 'challenge' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                What&apos;s your biggest challenge right now?
              </h1>
              <p className="text-gray-500 text-center text-sm mb-8">We&apos;ll prioritise this in your learning path</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'customers', icon: '🎯', label: 'Getting more customers' },
                  { id: 'team', icon: '👥', label: 'Building a strong team' },
                  { id: 'capital', icon: '💰', label: 'Raising capital' },
                  { id: 'scaling', icon: '📈', label: 'Scaling efficiently' },
                  { id: 'competition', icon: '🏆', label: 'Standing out' },
                  { id: 'cashflow', icon: '💵', label: 'Managing cash flow' },
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => { set('challenge', o.id); next('projection'); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center hover:border-blue-300 transition-all"
                    style={{ borderColor: state.challenge === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.challenge === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <span className="text-2xl">{o.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: PROJECTION ────────────────────────────────────────── */}
          {step === 'projection' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">Your personalised CEO plan</h1>
              <p className="text-gray-500 text-center text-sm mb-6">Based on your profile, here&apos;s how you&apos;ll grow</p>

              {/* Week plan */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Growth Projection</h3>
                <div className="space-y-4">
                  {[
                    { week: 'Week 1', color: '#1E4EFF', label: 'Business Fundamentals', desc: 'Master competitive advantages, moats, and positioning through real company cases' },
                    { week: 'Week 2', color: '#059669', label: 'Sales & Revenue', desc: 'Learn proven closing techniques, pricing strategy, and how to increase LTV' },
                    { week: 'Week 3', color: '#7C3AED', label: 'Growth & Scale', desc: 'Spot growth levers early — learn when to double down vs. pivot' },
                    { week: 'Week 4', color: '#DC2626', label: 'CEO Decision-Making', desc: 'Make high-stakes decisions under pressure like the world\'s best founders' },
                  ].map(w => (
                    <div key={w.week}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-0.5">{w.week}</span>
                        <div className="flex-1 border-t border-dashed border-gray-200" />
                        <span className="text-xs font-semibold text-white px-3 py-1 rounded-full" style={{ backgroundColor: w.color }}>{w.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 pl-2">{w.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills matrix */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Skills Matrix</h3>
                <div className="space-y-2">
                  {[
                    'Business Strategy', 'Sales Execution', 'Financial Literacy', 'Market Analysis', 'Leadership',
                  ].map(skill => (
                    <div key={skill} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 flex-1">{skill}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Current: Low</span>
                      <span className="text-xs text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#059669' }}>Projected: High</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => next('loading')} className="w-full py-4 rounded-2xl font-bold text-white text-lg" style={{ backgroundColor: '#1E4EFF' }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP: LOADING ───────────────────────────────────────────── */}
          {step === 'loading' && (
            <div className="animate-fadeUp relative min-h-[60vh] flex flex-col">
              <div className="flex-1">
                <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Building your</h1>
                <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: '#1E4EFF' }}>CEO Profile…</h2>

                <div className="space-y-5 mb-8">
                  {[
                    { label: 'Decision style mapped', done: loadingProgress >= 20 },
                    { label: 'Calculating risk tolerance', progress: Math.min(100, Math.max(0, (loadingProgress - 20) * 2.5)), done: loadingProgress >= 60 },
                    { label: 'Matching mentor frameworks', progress: Math.min(100, Math.max(0, (loadingProgress - 60) * 2.5)), done: loadingProgress >= 100 },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        {item.done ? (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#1E4EFF' }}>✓</span>
                        ) : (
                          <span className="text-sm text-gray-400">{Math.round(item.progress || 0)}%</span>
                        )}
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ backgroundColor: '#1E4EFF', width: item.done ? '100%' : `${item.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social proof */}
                <div className="text-center text-gray-400 text-sm mb-4">10,000+ CEO profiles created</div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-1 text-yellow-400 mb-2">{'★★★★★'}</div>
                  <p className="text-sm text-gray-600 italic">&ldquo;I&apos;ve read every startup book. Nothing stuck like this. After 3 weeks my close rate went from 22% to 41%.&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-2">by marcus_ceo</p>
                </div>
              </div>

              {/* Risk popup */}
              {showRiskPopup && loadingProgress < 100 && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
                  <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-pop">
                    <p className="text-sm text-gray-500 text-center mb-2">To move forward, specify</p>
                    <h3 className="text-lg font-bold text-gray-900 text-center mb-6">
                      Do you take big risks for big rewards?
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => { set('riskTaker', false); setShowRiskPopup(false); }}
                        className="py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-700 hover:border-blue-300 transition-all"
                      >
                        No
                      </button>
                      <button
                        onClick={() => { set('riskTaker', true); setShowRiskPopup(false); }}
                        className="py-3 rounded-xl border-2 font-semibold text-white transition-all"
                        style={{ borderColor: '#1E4EFF', backgroundColor: '#1E4EFF' }}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loadingProgress >= 100 && !showRiskPopup && (
                <button
                  onClick={() => next('result')}
                  className="w-full py-4 rounded-2xl font-bold text-white text-lg mt-6 animate-fadeUp"
                  style={{ backgroundColor: '#1E4EFF' }}
                >
                  View My CEO Profile →
                </button>
              )}
            </div>
          )}

          {/* ── STEP: RESULT ────────────────────────────────────────────── */}
          {step === 'result' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Your CEO Profile</h1>
              <p className="text-gray-500 text-center text-sm mb-6">Based on your choices, here&apos;s how you think</p>

              {/* Radar */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4 flex flex-col items-center">
                <RadarChart values={radarValues} />
              </div>

              {/* What drives you */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900">What Drives You</h3>
                  <span className="text-gray-300">⭐</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  {state.riskTaker
                    ? "You think in years, not months. You\'re okay with big risks when the upside is enormous. Bold moves and contrarian thinking are your edge."
                    : "You think carefully before acting. Data-driven decisions and sustainable growth are your foundation. You build to last."}
                </p>
              </div>

              {/* Strengths */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900">Your Strengths</h3>
                  <span className="text-gray-300">💪</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  You stay calm under pressure and think through consequences. You&apos;re wired for compounding — small edges repeated daily become massive advantages.
                </p>
              </div>

              <button onClick={() => next('social')} className="w-full py-4 rounded-2xl font-bold text-white text-lg" style={{ backgroundColor: '#1E4EFF' }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP: SOCIAL ────────────────────────────────────────────── */}
          {step === 'social' && (
            <div className="animate-fadeUp text-center">
              {/* World map SVG placeholder */}
              <div className="mb-8 flex justify-center">
                <svg viewBox="0 0 400 220" width="320" height="175" className="opacity-80">
                  <defs>
                    <radialGradient id="glow" cx="50%" cy="50%">
                      <stop offset="0%" stopColor="#1E4EFF" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#1E4EFF" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="200" cy="110" rx="180" ry="100" fill="url(#glow)" />
                  {/* Simplified continent-ish blobs */}
                  {[
                    'M60,80 Q80,60 120,70 Q140,80 130,110 Q110,130 80,120 Z',
                    'M150,60 Q200,50 230,70 Q250,90 240,130 Q220,150 180,140 Q150,120 145,90 Z',
                    'M260,90 Q290,80 310,100 Q320,120 305,140 Q280,150 260,130 Z',
                    'M170,150 Q200,140 220,160 Q215,180 190,185 Q165,180 170,160 Z',
                  ].map((d, i) => (
                    <path key={i} d={d} fill="#1E4EFF" opacity="0.15" stroke="#1E4EFF" strokeWidth="1" strokeOpacity="0.3" />
                  ))}
                  {/* Dots */}
                  {[[100, 90], [190, 80], [280, 110], [195, 160], [320, 95], [70, 120], [240, 70]].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="#1E4EFF" opacity="0.6" />
                  ))}
                </svg>
              </div>

              {/* Stats pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['🌍 50+ countries', '⭐ 4.9 rating', '📈 89% improved'].map(s => (
                  <span key={s} className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full">{s}</span>
                ))}
              </div>

              <h2 className="text-2xl font-extrabold mb-1">
                <span style={{ color: '#1E4EFF' }}>Join 10,000+ founders</span>
              </h2>
              <p className="font-bold text-gray-900 mb-3">who train their mind like a CEO</p>
              <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
                Now that you know your CEO profile, join a community of founders using these insights to make smarter decisions every day.
              </p>

              <button onClick={() => next('email')} className="w-full py-4 rounded-2xl font-bold text-white text-lg" style={{ backgroundColor: '#1E4EFF' }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP: EMAIL ─────────────────────────────────────────────── */}
          {step === 'email' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                Your CEO Profile is ready
              </h1>
              <p className="text-gray-500 text-center text-sm mb-8">
                Enter your email to save your profile and start training
              </p>

              <input
                type="email"
                value={state.email}
                onChange={e => set('email', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmailContinue()}
                placeholder="example@gmail.com"
                className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-gray-900 text-base focus:outline-none focus:border-blue-500 mb-2"
              />
              <p className="text-xs text-gray-400 text-center mb-8">🔒 We won&apos;t spam you or give away your email</p>

              <button
                onClick={handleEmailContinue}
                disabled={!state.email.includes('@')}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg disabled:opacity-40 mb-3"
                style={{ backgroundColor: '#1E4EFF' }}
              >
                Continue with Email →
              </button>
            </div>
          )}

          {/* ── STEP: PRICING ───────────────────────────────────────────── */}
          {step === 'pricing' && (
            <div className="animate-fadeUp">
              {/* Promo banner */}
              <div className="rounded-2xl p-4 mb-6 text-white" style={{ backgroundColor: '#1E4EFF' }}>
                <div className="flex items-center gap-2 font-bold text-sm mb-2">
                  <span>🏷️</span> Your promo code applied!
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-700 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <span className="text-xs">✓</span>
                      <span className="text-xs font-bold tracking-wide">{promoCode}</span>
                    </div>
                  </div>
                  <div className="bg-blue-700 rounded-xl px-3 py-1.5 text-center">
                    <div className="text-sm font-bold">{promoMins} : {promoSecs}</div>
                    <div className="text-xs opacity-70">min  sec</div>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-4">Choose your plan</h2>

              {/* Plan selector */}
              <div className="space-y-3 mb-6">
                {PLANS.map(plan => {
                  const sel = state.selectedPlan === plan.id;
                  return (
                    <div key={plan.id}>
                      {plan.popular && (
                        <div className="text-center text-xs font-bold text-white py-1.5 rounded-t-2xl" style={{ backgroundColor: '#1E4EFF' }}>
                          MOST POPULAR
                        </div>
                      )}
                      <button
                        onClick={() => set('selectedPlan', plan.id)}
                        className="w-full p-4 border-2 text-left transition-all"
                        style={{
                          borderColor: sel ? '#1E4EFF' : plan.popular ? '#1E4EFF' : '#e5e7eb',
                          backgroundColor: sel ? '#f0f4ff' : 'white',
                          borderRadius: plan.popular ? '0 0 16px 16px' : '16px',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                            style={{ borderColor: sel ? '#1E4EFF' : '#9ca3af' }}>
                            {sel && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#1E4EFF' }} />}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900">{plan.label}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#059669' }}>{plan.save}</span>
                              <span className="text-xs text-gray-400 line-through">{plan.originalPrice}</span>
                              <span className="text-xs font-semibold text-gray-700">{plan.price}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400 line-through">{plan.originalPrice.replace('$', '$')}</div>
                            <div className="text-3xl font-black text-gray-900">{plan.perDay.replace('$0.', '$0.')}</div>
                            <div className="text-xs text-gray-400">PER DAY</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Stripe payment */}
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#1E4EFF' } } }}>
                  <StripePaymentForm
                    clientSecret={clientSecret}
                    onSuccess={handlePaySuccess}
                    plan={PLANS.find(p => p.id === state.selectedPlan)!}
                  />
                </Elements>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-gray-400">Preparing secure checkout…</span>
                </div>
              )}

              {/* Guarantee */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mt-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏅</span>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">30-day Money-Back Guarantee</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      If you don&apos;t see the value after completing sessions, we&apos;ll refund every penny. No questions asked.
                    </p>
                  </div>
                </div>
              </div>

              {/* Social proof */}
              <div className="mt-6 space-y-3">
                {[
                  { user: 'james_t92', src: '🎮', text: "Didn't expect to get hooked this fast. The scenarios are genuinely interesting." },
                  { user: 'SarahMktg', src: '📱', text: "Every session teaches me something I genuinely didn't see coming." },
                  { user: 'priya.reads', src: '📚', text: "Completely reframed how I think about brand trust and positioning." },
                ].map(r => (
                  <div key={r.user} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">{r.src}</div>
                        <span className="text-sm font-medium text-gray-700">by {r.user}</span>
                      </div>
                      <span className="text-yellow-400 text-xs">★★★★★</span>
                    </div>
                    <p className="text-sm text-gray-600">&ldquo;{r.text}&rdquo;</p>
                  </div>
                ))}
              </div>

              {/* What you get */}
              <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mt-6">
                <h4 className="font-bold text-gray-900 mb-3">What you get with MentorCEO Premium</h4>
                <ul className="space-y-2">
                  {[
                    'Learn from 15+ world-class founders & mentors',
                    'AI-personalised daily sessions (5–30 min)',
                    'Interactive scenarios, quizzes & challenges',
                    'Spaced repetition that makes knowledge stick',
                    'Audio mode — learn anywhere, anytime',
                    'Your complete CEO Profile + growth tracking',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* FAQ */}
              <div className="mt-6">
                <h4 className="font-bold text-gray-900 mb-4">Frequently asked questions</h4>
                {[
                  { q: 'Why do I need MentorCEO?', a: 'Most founders learn business skills too slowly — reading books, watching hours of YouTube, trial and error. MentorCEO gives you the exact frameworks used by top CEOs in 5 minutes a day, personalised to your situation.' },
                  { q: 'How is this different from reading books?', a: 'Books are passive. MentorCEO uses active recall, spaced repetition, and real scenarios. Your brain retains 60% more with active learning vs. passive reading.' },
                  { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from your account settings. And if you\'re not satisfied within 30 days, we\'ll refund you completely.' },
                ].map(faq => (
                  <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>

              {/* Powered by Stripe */}
              <div className="flex flex-col items-center gap-3 mt-6">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-gray-400">Powered by</span>
                  <span className="font-bold text-gray-700 text-sm">stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  {['ApplePay', 'GooglePay', 'Visa', 'MC', 'Amex'].map(b => (
                    <span key={b} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">{b}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 py-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <span className="text-gray-400 ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{a}</p>}
    </div>
  );
}

function SuccessPage({ email }: { email: string }) {
  return (
    <>
      <Head>
        <title>Welcome to MentorCEO! 🎉</title>
      </Head>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">You&apos;re in!</h1>
          <p className="text-gray-500 mb-2">A confirmation has been sent to</p>
          <p className="font-semibold text-gray-900 mb-8">{email}</p>

          <div className="bg-blue-50 rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Download the MentorCEO app</h2>
            <div className="space-y-3">
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl text-white font-semibold transition-all"
                style={{ backgroundColor: '#0F172A' }}
              >
                <span className="text-xl"></span>
                <span>Download on the App Store</span>
              </a>
              <a
                href="https://play.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl text-white font-semibold transition-all"
                style={{ backgroundColor: '#059669' }}
              >
                <span className="text-xl">▶</span>
                <span>Get it on Google Play</span>
              </a>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-4">Or train right now in your browser</p>
          <a
            href="https://app.mentorceo.io"
            className="inline-block text-white px-8 py-3.5 rounded-xl font-bold transition-all"
            style={{ backgroundColor: '#1E4EFF' }}
          >
            Open Web App →
          </a>

          <div className="mt-8 text-sm text-gray-400">
            <p>Questions? <a href="mailto:hello@mentorceo.io" className="underline">hello@mentorceo.io</a></p>
          </div>
        </div>
      </div>
    </>
  );
}
