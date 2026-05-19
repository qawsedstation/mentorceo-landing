import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import '../styles/globals.css';

const MENTORCEO_APPLICATION_ID = '6a0c2f12fbffcd5482b05f18';

declare global {
  interface Window {
    ADMIN_CHAT_APPLICATION_ID?: string;
  }
}

function SupportChat() {
  useEffect(() => {
    window.ADMIN_CHAT_APPLICATION_ID = MENTORCEO_APPLICATION_ID;

    const existing = document.querySelector('script[src="https://manage.happierleads.com/chat-widget.js"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://manage.happierleads.com/chat-widget.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-center" />
      <SupportChat />
    </>
  );
}
