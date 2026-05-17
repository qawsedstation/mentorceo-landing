import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://rest-dash.happierleads.com';
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuizStep =
  | 'stage' | 'personality' | 'learning_style' | 'focus' | 'revenue'
  | 'daily_time' | 'challenge' | 'motivation' | 'projection'
  | 'loading' | 'result' | 'social' | 'email' | 'pricing';
type Step = QuizStep | 'success';

interface QuizState {
  stage: string;
  personality: string;
  learningStyle: string;
  focus: string[];
  revenue: string;
  dailyTime: string;
  challenge: string;
  motivation: string;
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
    billedAs: 'Billed as $11.49',
    popular: false,
  },
  {
    id: 'price_1TYAegGB9TSabx4WeXtH9gE2',
    label: '3 months',
    originalPrice: '$49.95',
    price: '$19.99',
    perDay: '$0.22',
    save: 'SAVE 60%',
    billedAs: 'Billed as $19.99',
    popular: true,
  },
  {
    id: 'price_1TYAegGB9TSabx4WPDoCwjxx',
    label: '1 year',
    originalPrice: '$99.99',
    price: '$47.99',
    perDay: '$0.13',
    save: 'SAVE 52%',
    billedAs: 'Billed as $47.99',
    popular: false,
  },
];

const MENTORS = [
  { id: 'alex-hormozi',   name: 'Alex Hormozi',    img: 'https://unavatar.io/twitter/AlexHormozi' },
  { id: 'gary-vee',       name: 'Gary Vaynerchuk', img: 'https://unavatar.io/twitter/garyvee' },
  { id: 'naval',          name: 'Naval Ravikant',  img: 'https://unavatar.io/twitter/naval' },
  { id: 'paul-graham',    name: 'Paul Graham',     img: '/mentors/paul-graham.jpg' },
  { id: 'jeff-bezos',     name: 'Jeff Bezos',      img: 'https://unavatar.io/twitter/JeffBezos' },
  { id: 'steve-jobs',     name: 'Steve Jobs',      img: '/mentors/steve-jobs.jpg' },
  { id: 'oprah',          name: 'Oprah Winfrey',   img: '/mentors/oprah-winfrey.jpg' },
  { id: 'warren-buffett', name: 'Warren Buffett',  img: '/mentors/warren-buffett.jpg' },
  { id: 'grant-cardone',  name: 'Grant Cardone',   img: 'https://unavatar.io/twitter/GrantCardone' },
];

const FOCUS_OPTIONS = [
  { id: 'sales',    icon: '💰', label: 'Sales & Revenue' },
  { id: 'marketing',icon: '📣', label: 'Marketing & Brand' },
  { id: 'strategy', icon: '♟️', label: 'Strategy & Vision' },
  { id: 'mindset',  icon: '🧠', label: 'Leadership & Mindset' },
  { id: 'product',  icon: '💻', label: 'Product & Innovation' },
  { id: 'finance',  icon: '💵', label: 'Fundraising & Finance' },
];

const STEP_ORDER: QuizStep[] = [
  'stage', 'personality', 'learning_style', 'focus', 'revenue',
  'daily_time', 'challenge', 'motivation', 'projection',
  'loading', 'result', 'social', 'email', 'pricing',
];
const QUIZ_STEPS_COUNT = STEP_ORDER.indexOf('loading'); // steps before loading

const STEP_LABELS: Partial<Record<QuizStep, string>> = {
  stage:          'YOUR PROFILE',
  personality:    'PERSONALITY',
  learning_style: 'LEARNING STYLE',
  focus:          'FOCUS AREAS',
  revenue:        'REVENUE',
  daily_time:     'COMMITMENT',
  challenge:      'CHALLENGE',
  motivation:     'MOTIVATION',
  projection:     'YOUR PLAN',
  loading:        'ANALYSING',
  result:         'CEO PROFILE',
  social:         'COMMUNITY',
  email:          'SAVE PROFILE',
  pricing:        'GET ACCESS',
};

const LOADING_STEPS = [
  'Mapping your decision style…',
  'Calculating risk tolerance…',
  'Analysing growth potential…',
  'Matching mentor frameworks…',
  'Building your CEO profile…',
];

// ─── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChart({ values }: { values: number[] }) {
  const labels = ['DECISIVE', 'STRATEGIC', 'RISK-TAKER', 'GROWTH\nFOCUSED', 'RESILIENT', 'VISIONARY'];
  const cx = 120, cy = 120, r = 85;
  const n = labels.length;

  const pts = (vals: number[]) =>
    vals.map((v, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [cx + (v / 10) * r * Math.cos(a), cy + (v / 10) * r * Math.sin(a)];
    });

  const gridPts = (level: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return `${cx + level * r * Math.cos(a)},${cy + level * r * Math.sin(a)}`;
    }).join(' ');

  const valuePoints = pts(values).map(p => p.join(',')).join(' ');
  const labelPos = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + 1.22 * r * Math.cos(a), y: cy + 1.22 * r * Math.sin(a) };
  });

  return (
    <svg viewBox="0 0 240 240" width="240" height="240">
      {[0.2, 0.4, 0.6, 0.8, 1].map(l => (
        <polygon key={l} points={gridPts(l)} fill={l === 0.2 ? '#f0f4ff' : 'none'} stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      <polygon points={valuePoints} fill="rgba(30,78,255,0.15)" stroke="#1E4EFF" strokeWidth="2.5" />
      {pts(values).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="#1E4EFF" />)}
      {labelPos.map((pos, i) => (
        <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
          fill="#6b7280" fontSize="7.5" fontWeight="700" fontFamily="system-ui">
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
      if (error) toast.error(error.message || 'Payment failed');
      else onSuccess();
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Quiz() {
  const [step, setStep] = useState<Step>('stage');
  const [state, setState] = useState<QuizState>({
    stage: '', personality: '', learningStyle: '', focus: [], revenue: '',
    dailyTime: '', challenge: '', motivation: '', riskTaker: null,
    email: '', selectedPlan: PLANS[1].id,
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [showRiskPopup, setShowRiskPopup] = useState(false);
  const [riskAnswered, setRiskAnswered] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise] = useState(() => loadStripe(STRIPE_PK));
  const [promoSecondsLeft, setPromoSecondsLeft] = useState(10 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Refs to avoid stale closures in loading interval
  const loadingPausedRef = useRef(false);
  const riskPopupShownRef = useRef(false);

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

  // Loading animation — uses refs to avoid stale closures
  useEffect(() => {
    if (step !== 'loading') return;
    setLoadingProgress(0);
    setLoadingStepIdx(0);
    setShowRiskPopup(false);
    setRiskAnswered(false);
    loadingPausedRef.current = false;
    riskPopupShownRef.current = false;
    let p = 0;

    const interval = setInterval(() => {
      if (loadingPausedRef.current) return;

      p = Math.min(p + 1.2, 100);
      setLoadingProgress(p);
      setLoadingStepIdx(Math.min(Math.floor(p / 20), LOADING_STEPS.length - 1));

      // Show popup at ~50% — only once, using ref to avoid stale closure
      if (p >= 50 && !riskPopupShownRef.current) {
        riskPopupShownRef.current = true;
        loadingPausedRef.current = true;
        setShowRiskPopup(true);
      }

      if (p >= 100) {
        clearInterval(interval);
        // Auto-advance to result after brief pause
        setTimeout(() => setStep('result'), 700);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [step]);

  const stepIndex = STEP_ORDER.indexOf(step as QuizStep);
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

  const answerRisk = (answer: boolean) => {
    set('riskTaker', answer);
    setRiskAnswered(true);
    setShowRiskPopup(false);
    loadingPausedRef.current = false; // resume loading
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
    try {
      const res = await fetch(`${API}/mentorceo/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.email, priceId: state.selectedPlan }),
      });
      const data = await res.json();
      if (data.clientSecret) setClientSecret(data.clientSecret);
      else toast.error('Could not start payment. Try again.');
    } catch {
      toast.error('Network error. Please try again.');
    }
  };

  const handleEmailContinue = async () => {
    if (!state.email || !state.email.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    next('pricing');
    createSubscription();
  };

  if (step === 'success') return <SuccessPage email={state.email} />;

  const isQuizStep = (STEP_ORDER as string[]).includes(step) && stepIndex <= STEP_ORDER.indexOf('loading');
  const progressBarCount = STEP_ORDER.indexOf('loading') + 1;

  return (
    <>
      <Head>
        <title>Build Your CEO Profile — MentorCEO</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* ── Header ── */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
            {stepIndex > 0 && step !== 'loading' && step !== 'result' && step !== 'social' && (
              <button onClick={back} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 absolute left-4">
                ← Back
              </button>
            )}
            <Link href="/" className="flex items-center gap-1.5 mx-auto">
              <span className="text-xl">👑</span>
              <span className="font-bold text-gray-900">MentorCEO</span>
            </Link>
          </div>
          {/* Progress bar */}
          {(STEP_ORDER as string[]).includes(step) && (
            <div className="max-w-lg mx-auto px-6 pb-3">
              <div className="flex items-center gap-1">
                {STEP_ORDER.slice(0, progressBarCount).map((s, i) => (
                  <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: '#1E4EFF',
                        width: i < stepIndex ? '100%' : i === stepIndex ? '70%' : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>
              {STEP_LABELS[step as QuizStep] && (
                <p className="text-center text-xs font-semibold mt-2 tracking-widest" style={{ color: '#1E4EFF' }}>
                  {STEP_LABELS[step as QuizStep]}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="max-w-lg mx-auto px-4 py-8 pb-24">

          {/* ── STAGE ─────────────────────────────────────────────────────── */}
          {step === 'stage' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                Where are you in your business journey?
              </h1>
              <p className="text-gray-400 text-center text-sm mb-8">We personalise every lesson to your exact stage</p>
              <div className="space-y-3">
                {[
                  { id: 'idea',    icon: '🌱', label: 'Just getting started',  sub: 'Idea or pre-revenue stage' },
                  { id: 'early',   icon: '📈', label: 'Early traction',         sub: 'First customers, building momentum' },
                  { id: 'growing', icon: '🚀', label: 'Growing fast',            sub: 'Revenue, team, scaling challenges' },
                  { id: 'scaling', icon: '🏆', label: 'Scaling up',              sub: 'Established — optimising everything' },
                ].map(o => (
                  <button key={o.id}
                    onClick={() => { set('stage', o.id); next(); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left hover:shadow-sm transition-all"
                    style={{ borderColor: state.stage === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.stage === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <span className="text-3xl">{o.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{o.sub}</div>
                    </div>
                    {state.stage === o.id && <span style={{ color: '#1E4EFF' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PERSONALITY ───────────────────────────────────────────────── */}
          {step === 'personality' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                Which business leader do you respect most?
              </h1>
              <p className="text-gray-400 text-center text-sm mb-6">Their thinking style will shape your learning path</p>
              <div className="grid grid-cols-3 gap-3">
                {MENTORS.map(m => {
                  const sel = state.personality === m.id;
                  return (
                    <button key={m.id}
                      onClick={() => { set('personality', m.id); next(); }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all hover:shadow-sm"
                      style={{ borderColor: sel ? '#1E4EFF' : '#e5e7eb', backgroundColor: sel ? '#f0f4ff' : 'white' }}
                    >
                      <div className="relative">
                        <img
                          src={m.img}
                          alt={m.name}
                          width={72} height={72}
                          className="rounded-full object-cover"
                          style={{ width: 72, height: 72, filter: sel ? 'none' : 'grayscale(100%)' }}
                          onError={(e) => {
                            const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=1E4EFF&color=fff&size=128&bold=true`;
                          }}
                        />
                        {sel && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: '#1E4EFF' }}>✓</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LEARNING STYLE ────────────────────────────────────────────── */}
          {step === 'learning_style' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                How do you learn best?
              </h1>
              <p className="text-gray-400 text-center text-sm mb-8">We&apos;ll adapt the format to match your style</p>
              <div className="space-y-3">
                {[
                  { id: 'scenarios', icon: '🎭', label: 'Real business scenarios',     sub: 'Hands-on case studies and decisions' },
                  { id: 'frameworks',icon: '📐', label: 'Frameworks and models',       sub: 'Structured systems to apply immediately' },
                  { id: 'stories',   icon: '📖', label: 'Founder stories',             sub: 'What worked (and what didn\'t) for others' },
                  { id: 'challenges',icon: '⚡', label: 'Daily challenges',            sub: 'Quick tests that build sharp thinking' },
                ].map(o => (
                  <button key={o.id}
                    onClick={() => { set('learningStyle', o.id); next(); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left hover:shadow-sm transition-all"
                    style={{ borderColor: state.learningStyle === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.learningStyle === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <span className="text-3xl">{o.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{o.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── FOCUS ─────────────────────────────────────────────────────── */}
          {step === 'focus' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                What do you most want to improve?
              </h1>
              <p className="text-gray-400 text-center text-sm mb-8">Pick all that apply — we&apos;ll prioritise the most urgent</p>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_OPTIONS.map(o => {
                  const sel = state.focus.includes(o.id);
                  return (
                    <button key={o.id}
                      onClick={() => set('focus', sel ? state.focus.filter(f => f !== o.id) : [...state.focus, o.id])}
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-sm"
                      style={{ borderColor: sel ? '#1E4EFF' : '#e5e7eb', backgroundColor: sel ? '#f0f4ff' : 'white' }}
                    >
                      <span className="text-2xl">{o.icon}</span>
                      <span className="font-medium text-gray-800 text-sm flex-1">{o.label}</span>
                      {sel && <span className="text-sm flex-shrink-0" style={{ color: '#1E4EFF' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => next()} disabled={state.focus.length === 0}
                className="mt-6 w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 transition-all"
                style={{ backgroundColor: '#1E4EFF' }}>
                Continue ({state.focus.length} selected) →
              </button>
            </div>
          )}

          {/* ── REVENUE ───────────────────────────────────────────────────── */}
          {step === 'revenue' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                What&apos;s your current monthly revenue?
              </h1>
              <p className="text-gray-400 text-center text-sm mb-8">Helps us calibrate the difficulty and relevance</p>
              <div className="space-y-3">
                {[
                  { id: 'none',      label: 'No revenue yet',    sub: 'Building and validating' },
                  { id: 'under5k',   label: 'Under $5K/month',   sub: 'Early traction' },
                  { id: '5k-50k',    label: '$5K – $50K/month',  sub: 'Growing steadily' },
                  { id: '50k+',      label: '$50K+/month',       sub: 'Scaling operations' },
                ].map(o => (
                  <button key={o.id}
                    onClick={() => { set('revenue', o.id); next(); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border-2 text-left hover:shadow-sm transition-all"
                    style={{ borderColor: state.revenue === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.revenue === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{o.sub}</div>
                    </div>
                    {state.revenue === o.id && <span style={{ color: '#1E4EFF' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── DAILY TIME ────────────────────────────────────────────────── */}
          {step === 'daily_time' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                How much time can you commit daily?
              </h1>
              <p className="text-gray-400 text-center text-sm mb-6">Even 5 minutes a day compounds into massive advantages over a year</p>
              {/* Visual time commitment bars */}
              <div className="space-y-3">
                {[
                  { id: '5min',  icon: '⚡', label: '5 minutes',   sub: 'Quick habit — huge ROI',   bar: 25 },
                  { id: '10min', icon: '📚', label: '10 minutes',  sub: 'Steady daily progress',   bar: 50 },
                  { id: '15min', icon: '🎯', label: '15 minutes',  sub: 'Serious learner',         bar: 75 },
                  { id: '30min+',icon: '💪', label: '30+ minutes', sub: 'Full commitment mode',    bar: 100 },
                ].map(o => (
                  <button key={o.id}
                    onClick={() => { set('dailyTime', o.id); next(); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left hover:shadow-sm transition-all"
                    style={{ borderColor: state.dailyTime === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.dailyTime === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <span className="text-2xl">{o.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{o.label}</span>
                        <span className="text-xs text-gray-400">{o.sub}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${o.bar}%`, backgroundColor: '#1E4EFF' }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── CHALLENGE ─────────────────────────────────────────────────── */}
          {step === 'challenge' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                What&apos;s your biggest challenge right now?
              </h1>
              <p className="text-gray-400 text-center text-sm mb-8">We&apos;ll build your first week around solving this</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'customers',   icon: '🎯', label: 'Getting more customers' },
                  { id: 'team',        icon: '👥', label: 'Building a strong team' },
                  { id: 'capital',     icon: '💰', label: 'Raising capital' },
                  { id: 'scaling',     icon: '📈', label: 'Scaling efficiently' },
                  { id: 'competition', icon: '🏆', label: 'Standing out' },
                  { id: 'cashflow',    icon: '💵', label: 'Managing cash flow' },
                ].map(o => (
                  <button key={o.id}
                    onClick={() => { set('challenge', o.id); next(); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center hover:shadow-sm transition-all"
                    style={{ borderColor: state.challenge === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.challenge === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <span className="text-3xl">{o.icon}</span>
                    <span className="text-sm font-medium text-gray-800 leading-tight">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── MOTIVATION ────────────────────────────────────────────────── */}
          {step === 'motivation' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
                What drives you to keep building?
              </h1>
              <p className="text-gray-400 text-center text-sm mb-8">Understanding your why helps us keep you motivated</p>
              <div className="space-y-3">
                {[
                  { id: 'freedom',  icon: '🌅', label: 'Freedom & independence',   sub: 'Build life on your own terms' },
                  { id: 'impact',   icon: '🌍', label: 'Impact & legacy',           sub: 'Create something that outlasts you' },
                  { id: 'wealth',   icon: '💎', label: 'Financial freedom',         sub: 'Build serious wealth through business' },
                  { id: 'mastery',  icon: '🎯', label: 'Mastery & growth',          sub: 'Become the best version of yourself' },
                ].map(o => (
                  <button key={o.id}
                    onClick={() => { set('motivation', o.id); next(); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left hover:shadow-sm transition-all"
                    style={{ borderColor: state.motivation === o.id ? '#1E4EFF' : '#e5e7eb', backgroundColor: state.motivation === o.id ? '#f0f4ff' : 'white' }}
                  >
                    <span className="text-3xl">{o.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{o.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PROJECTION ────────────────────────────────────────────────── */}
          {step === 'projection' && (
            <div className="animate-fadeUp">
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">Your personalised CEO plan</h1>
              <p className="text-gray-400 text-center text-sm mb-6">Based on your profile, here&apos;s exactly how you&apos;ll grow</p>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📅</span> Growth Projection
                </h3>
                <div className="space-y-4">
                  {[
                    { week: 'Week 1', color: '#1E4EFF', label: 'Business Fundamentals',  desc: 'Master competitive advantages, moats, and positioning through real company cases' },
                    { week: 'Week 2', color: '#059669', label: 'Sales & Revenue',         desc: 'Learn proven closing techniques, pricing strategy, and how to increase LTV' },
                    { week: 'Week 3', color: '#7C3AED', label: 'Growth & Scale',           desc: 'Spot growth levers early — learn when to double down vs. pivot' },
                    { week: 'Week 4', color: '#DC2626', label: 'CEO Decision-Making',      desc: 'Make high-stakes decisions under pressure like the world\'s best founders' },
                  ].map(w => (
                    <div key={w.week}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-0.5 flex-shrink-0">{w.week}</span>
                        <div className="flex-1 border-t border-dashed border-gray-200" />
                        <span className="text-xs font-semibold text-white px-3 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: w.color }}>{w.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 pl-2 leading-relaxed">{w.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📊</span> Skills Matrix
                </h3>
                <div className="space-y-3">
                  {[
                    'Business Strategy', 'Sales Execution', 'Financial Literacy', 'Market Analysis', 'Leadership',
                  ].map(skill => (
                    <div key={skill} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 flex-1">{skill}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Current: Low</span>
                      <span className="text-xs text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: '#059669' }}>Projected: High</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social proof teaser */}
              <div className="bg-blue-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <p className="text-sm text-gray-700"><strong>10,000+ founders</strong> have completed this plan and reported better decisions within the first week.</p>
              </div>

              <button onClick={() => next()} className="w-full py-4 rounded-2xl font-bold text-white text-base" style={{ backgroundColor: '#1E4EFF' }}>
                Analyse My Profile →
              </button>
            </div>
          )}

          {/* ── LOADING ───────────────────────────────────────────────────── */}
          {step === 'loading' && (
            <div className="animate-fadeUp flex flex-col min-h-[65vh]">
              <div className="flex-1">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Building your</h1>
                  <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#1E4EFF' }}>CEO Profile…</h2>
                  <p className="text-sm text-gray-400">{LOADING_STEPS[loadingStepIdx]}</p>
                </div>

                {/* Animated progress bars */}
                <div className="space-y-5 mb-8">
                  {[
                    { label: 'Decision style mapped',        threshold: 0 },
                    { label: 'Calculating risk tolerance',   threshold: 33 },
                    { label: 'Matching mentor frameworks',   threshold: 66 },
                  ].map((item, i) => {
                    const started = loadingProgress >= item.threshold;
                    const segProgress = started
                      ? Math.min(100, ((loadingProgress - item.threshold) / 33) * 100)
                      : 0;
                    const done = segProgress >= 100;
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          {done ? (
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0" style={{ backgroundColor: '#1E4EFF' }}>✓</span>
                          ) : started ? (
                            <span className="text-xs text-gray-400">{Math.round(segProgress)}%</span>
                          ) : null}
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{ backgroundColor: '#1E4EFF', width: `${segProgress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall progress */}
                <div className="mb-8">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Profile completion</span>
                    <span>{Math.round(loadingProgress)}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{ background: 'linear-gradient(90deg, #1E4EFF, #7C3AED)', width: `${loadingProgress}%` }}
                    />
                  </div>
                </div>

                <div className="text-center text-gray-400 text-sm mb-4">10,000+ CEO profiles created</div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex gap-0.5 text-yellow-400 mb-2 text-sm">{'★★★★★'}</div>
                  <p className="text-sm text-gray-600 italic leading-relaxed">&ldquo;I&apos;ve read every startup book. Nothing stuck like this. After 3 weeks my close rate went from 22% to 41%.&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-2">by marcus_ceo</p>
                </div>
              </div>

              {/* Risk popup — mid-loading */}
              {showRiskPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
                  <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl animate-pop">
                    <div className="text-center mb-1">
                      <div className="text-4xl mb-3">⚡</div>
                      <p className="text-xs text-gray-400 font-semibold tracking-widest mb-2">ONE MORE THING</p>
                      <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                        Do you take big risks for big rewards?
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">This shapes how we calibrate your CEO profile</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <button
                        onClick={() => answerRisk(false)}
                        className="py-3.5 rounded-2xl border-2 border-gray-200 font-semibold text-gray-700 hover:border-gray-400 transition-all text-base"
                      >
                        I play it safe
                      </button>
                      <button
                        onClick={() => answerRisk(true)}
                        className="py-3.5 rounded-2xl font-semibold text-white transition-all text-base"
                        style={{ backgroundColor: '#1E4EFF' }}
                      >
                        All in 🔥
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── RESULT ────────────────────────────────────────────────────── */}
          {step === 'result' && (
            <div className="animate-fadeUp">
              <div className="text-center mb-6">
                <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#1E4EFF' }}>YOUR CEO PROFILE</p>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">You think like a CEO</h1>
                <p className="text-gray-400 text-sm">Based on your answers, here&apos;s how your mind works</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4 flex flex-col items-center">
                <RadarChart values={radarValues} />
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {['Decisive', 'Strategic', state.riskTaker ? 'Risk-Taker' : 'Calculated', 'Growth-Focused'].map(tag => (
                    <span key={tag} className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: '#1E4EFF' }}>{tag}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
                <h3 className="font-bold text-gray-900 mb-3">What drives you</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {state.riskTaker
                    ? "You think in years, not months. You're comfortable with big risks when the upside is enormous. Bold moves and contrarian thinking are your edge — you don't follow the herd."
                    : "You make data-driven decisions and build sustainable momentum. You don't chase trends — you compound small edges into massive advantages over time."}
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Your growth edge</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Founders with your profile who commit to 5 focused minutes a day typically see measurable improvements in their decision-making within 2–3 weeks. The key is consistency over intensity.
                </p>
              </div>

              <button onClick={() => next()} className="w-full py-4 rounded-2xl font-bold text-white text-base" style={{ backgroundColor: '#1E4EFF' }}>
                See Your Community →
              </button>
            </div>
          )}

          {/* ── SOCIAL ────────────────────────────────────────────────────── */}
          {step === 'social' && (
            <div className="animate-fadeUp text-center">
              <p className="text-xs font-semibold tracking-widest mb-2" style={{ color: '#1E4EFF' }}>YOU&apos;RE IN GOOD COMPANY</p>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Join 10,000+ founders</h1>
              <p className="text-gray-400 text-sm mb-6">who train their mind like a CEO every single day</p>

              {/* World map */}
              <div className="mb-6 flex justify-center">
                <svg viewBox="0 0 400 220" width="320" height="175">
                  <defs>
                    <radialGradient id="glow" cx="50%" cy="50%">
                      <stop offset="0%" stopColor="#1E4EFF" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#1E4EFF" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="200" cy="110" rx="190" ry="105" fill="url(#glow)" />
                  {[
                    'M55,75 Q80,55 125,68 Q148,78 135,112 Q112,135 78,122 Z',
                    'M148,58 Q202,48 232,68 Q255,90 243,132 Q222,154 178,143 Q147,122 143,88 Z',
                    'M258,88 Q292,77 314,100 Q325,122 308,143 Q280,153 258,132 Z',
                    'M168,148 Q200,138 222,160 Q218,182 192,187 Q163,182 168,160 Z',
                  ].map((d, i) => (
                    <path key={i} d={d} fill="#1E4EFF" opacity="0.12" stroke="#1E4EFF" strokeWidth="1" strokeOpacity="0.2" />
                  ))}
                  {[[98,88],[192,78],[280,108],[195,158],[322,93],[68,118],[243,68],[150,128],[345,130]].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="3.5" fill="#1E4EFF" opacity="0.7">
                      <animate attributeName="opacity" values="0.7;0.3;0.7" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                </svg>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['🌍 50+ countries', '⭐ 4.9 rating', '📈 89% improved', '🔥 10K+ founders'].map(s => (
                  <span key={s} className="bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-full font-medium">{s}</span>
                ))}
              </div>

              {/* Testimonials */}
              <div className="space-y-3 mb-8 text-left">
                {[
                  { name: 'Marcus T.',    rating: 5, text: "After 3 weeks my close rate went from 22% to 41%. Nothing I've read before stuck like this." },
                  { name: 'Priya K.',     rating: 5, text: "Completely reframed how I think about positioning. Our Q1 revenue was up 67%." },
                  { name: 'James L.',     rating: 5, text: "I didn't expect to get this hooked. Every scenario teaches something I actually needed to hear." },
                ].map((r, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-gray-900">{r.name}</span>
                      <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}</span>
                    </div>
                    <p className="text-sm text-gray-600">&ldquo;{r.text}&rdquo;</p>
                  </div>
                ))}
              </div>

              <button onClick={() => next()} className="w-full py-4 rounded-2xl font-bold text-white text-base" style={{ backgroundColor: '#1E4EFF' }}>
                Save My Profile →
              </button>
            </div>
          )}

          {/* ── EMAIL ─────────────────────────────────────────────────────── */}
          {step === 'email' && (
            <div className="animate-fadeUp">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">👑</div>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Your CEO Profile is ready</h1>
                <p className="text-gray-400 text-sm">Enter your email to save your profile and unlock your personalised plan</p>
              </div>

              {/* Profile preview */}
              <div className="bg-blue-50 rounded-2xl p-4 mb-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E4EFF' }}>
                  <span className="text-xl">👑</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">CEO Profile Complete</p>
                  <p className="text-xs text-gray-500 mt-0.5">Personalised to your stage · {state.focus.length} focus areas</p>
                </div>
              </div>

              <input
                type="email"
                value={state.email}
                onChange={e => set('email', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmailContinue()}
                placeholder="your@email.com"
                className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-gray-900 text-base focus:outline-none focus:border-blue-500 mb-3"
              />
              <p className="text-xs text-gray-400 text-center mb-6 flex items-center justify-center gap-1">
                <span>🔒</span> Your data is safe. No spam, ever.
              </p>

              <button
                onClick={handleEmailContinue}
                disabled={!state.email.includes('@')}
                className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40"
                style={{ backgroundColor: '#1E4EFF' }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── PRICING ───────────────────────────────────────────────────── */}
          {step === 'pricing' && (
            <div className="animate-fadeUp">
              {/* Promo banner */}
              <div className="rounded-2xl p-4 mb-6 text-white" style={{ backgroundColor: '#1E4EFF' }}>
                <div className="flex items-center gap-2 font-bold text-sm mb-3">
                  <span>🏷️</span> Promo code applied automatically
                </div>
                <div className="flex items-center justify-between">
                  <div className="bg-blue-700 rounded-xl px-3 py-2 flex items-center gap-2">
                    <span className="text-xs font-bold tracking-wide">{promoCode}</span>
                    <span className="text-xs bg-white/20 rounded px-1">✓</span>
                  </div>
                  <div className="bg-blue-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                    <div className="text-base font-black">{promoMins}:{promoSecs}</div>
                    <div className="text-xs opacity-70">expires</div>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Choose your plan</h2>
              <p className="text-gray-400 text-center text-sm mb-5">Cancel anytime · 30-day money-back guarantee</p>

              {/* Plans */}
              <div className="space-y-3 mb-6">
                {PLANS.map(plan => {
                  const sel = state.selectedPlan === plan.id;
                  return (
                    <div key={plan.id}>
                      {plan.popular && (
                        <div className="text-center text-xs font-bold text-white py-1.5 rounded-t-2xl" style={{ backgroundColor: '#1E4EFF' }}>
                          ⭐ MOST POPULAR — BEST VALUE
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
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#059669' }}>{plan.save}</span>
                              <span className="text-xs text-gray-400 line-through">{plan.originalPrice}</span>
                              <span className="text-xs text-gray-600">{plan.billedAs}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-black text-gray-900">{plan.perDay}</div>
                            <div className="text-xs text-gray-400">per day</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Payment form */}
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#1E4EFF' } } }}>
                  <StripePaymentForm
                    clientSecret={clientSecret}
                    onSuccess={() => next('success')}
                    plan={PLANS.find(p => p.id === state.selectedPlan)!}
                  />
                </Elements>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-gray-400">Preparing secure checkout…</span>
                </div>
              )}

              {/* Guarantee */}
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mt-6 flex items-start gap-3">
                <span className="text-2xl">🏅</span>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">30-day Money-Back Guarantee</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    If you don&apos;t see real value after completing sessions, we&apos;ll refund every penny. No questions asked.
                  </p>
                </div>
              </div>

              {/* What you get */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3">Everything included</h4>
                <ul className="space-y-2">
                  {[
                    '15+ world-class founder & CEO mentors',
                    'AI-personalised sessions (5–30 min daily)',
                    'Interactive scenarios that build real skills',
                    'Spaced repetition — knowledge that sticks',
                    'Audio mode — learn on the go',
                    'Full CEO Profile + progress tracking',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Testimonials */}
              <div className="mt-5 space-y-3">
                {[
                  { user: 'james_t92',    text: "Got hooked within 3 days. The scenarios are genuinely interesting, not just theory." },
                  { user: 'SarahMktg',    text: "Every session teaches me something I use the same week. ROI is insane." },
                  { user: 'priya.reads',  text: "Completely changed how I think about positioning and pricing." },
                ].map(r => (
                  <div key={r.user} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{r.user}</span>
                      <span className="text-yellow-400 text-xs">★★★★★</span>
                    </div>
                    <p className="text-sm text-gray-600">&ldquo;{r.text}&rdquo;</p>
                  </div>
                ))}
              </div>

              {/* FAQ */}
              <div className="mt-6">
                <h4 className="font-bold text-gray-900 mb-4">Frequently asked questions</h4>
                {[
                  { q: 'Why do I need MentorCEO?', a: 'Most founders learn too slowly — reading books, watching YouTube, trial and error. MentorCEO delivers the exact frameworks used by top CEOs in 5 minutes a day, personalised to your situation.' },
                  { q: 'How is this different from books?', a: 'Books are passive. MentorCEO uses active recall, spaced repetition, and real scenarios. Your brain retains 60% more with active learning vs. passive reading.' },
                  { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from your account settings. And if you\'re not satisfied within 30 days, we\'ll refund you completely.' },
                  { q: 'When will I see results?', a: 'Most users report noticeably sharper decision-making within 2 weeks. After 30 days, it\'s a permanent mental upgrade.' },
                ].map(faq => (
                  <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>

              {/* Payment badges */}
              <div className="flex flex-col items-center gap-3 mt-6 pb-4">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-gray-400">Powered by</span>
                  <span className="font-bold text-gray-700 text-sm">stripe</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {['Apple Pay', 'Google Pay', 'Visa', 'Mastercard', 'Amex'].map(b => (
                    <span key={b} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded font-medium">{b}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1"><span>🔒</span> 256-bit SSL encryption</p>
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
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left gap-3">
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <span className="text-gray-400 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{a}</p>}
    </div>
  );
}

function SuccessPage({ email }: { email: string }) {
  return (
    <>
      <Head><title>Welcome to MentorCEO! 🎉</title></Head>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">You&apos;re in!</h1>
          <p className="text-gray-500 mb-1">A confirmation has been sent to</p>
          <p className="font-semibold text-gray-900 mb-8">{email}</p>
          <div className="bg-blue-50 rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Download the MentorCEO app</h2>
            <div className="space-y-3">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl text-white font-semibold"
                style={{ backgroundColor: '#0F172A' }}>
                <span className="text-xl"></span>
                <span>Download on the App Store</span>
              </a>
              <a href="https://play.google.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl text-white font-semibold"
                style={{ backgroundColor: '#059669' }}>
                <span className="text-xl">▶</span>
                <span>Get it on Google Play</span>
              </a>
            </div>
          </div>
          <p className="text-sm text-gray-400">Questions? <a href="mailto:hello@mentorceo.io" className="underline">hello@mentorceo.io</a></p>
        </div>
      </div>
    </>
  );
}
