'use client';

import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      return;
    }

    setStatus('submitting');

    // For now, simulate a successful submission
    // TODO: Replace with actual newsletter service (Mailchimp, ConvertKit, etc.)
    await new Promise(resolve => setTimeout(resolve, 800));

    // Store in localStorage as a simple way to track interest
    // This can be exported later or replaced with a real service
    try {
      const existing = JSON.parse(localStorage.getItem('newsletter_signups') || '[]');
      existing.push({ email, timestamp: new Date().toISOString() });
      localStorage.setItem('newsletter_signups', JSON.stringify(existing));
    } catch {
      // Ignore localStorage errors
    }

    setStatus('success');
    setEmail('');
  };

  if (status === 'success') {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-accent font-semibold">You&apos;re on the list!</p>
        <p className="text-foreground/60 text-sm mt-1">
          We&apos;ll let you know when new content drops.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" aria-label="Newsletter signup">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        aria-required="true"
        className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="px-6 py-3 bg-accent hover:bg-accent/80 disabled:bg-accent/50 text-white font-semibold rounded-xl transition-colors"
      >
        {status === 'submitting' ? 'Signing up...' : 'Notify Me'}
      </button>
    </form>
  );
}
