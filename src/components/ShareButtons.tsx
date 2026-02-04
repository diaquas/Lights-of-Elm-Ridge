"use client";

import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export default function ShareButtons({
  url,
  title,
  description,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareOnFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, "facebook-share", "width=580,height=400");
  };

  const shareOnX = () => {
    const text = description ? `${title} - ${description}` : title;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "x-share", "width=580,height=400");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Share options">
      {/* Facebook */}
      <button
        onClick={shareOnFacebook}
        className="seq-share-icon w-[36px] h-[36px] rounded-full bg-surface border border-border flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-surface-light transition-colors"
        aria-label="Share on Facebook"
      >
        <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      {/* X (Twitter) */}
      <button
        onClick={shareOnX}
        className="seq-share-icon w-[36px] h-[36px] rounded-full bg-surface border border-border flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-surface-light transition-colors"
        aria-label="Share on X"
      >
        <svg className="w-[13px] h-[13px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* Copy Link */}
      <button
        onClick={copyLink}
        className={`seq-share-icon w-[36px] h-[36px] rounded-full border flex items-center justify-center transition-all ${
          copied
            ? "bg-green-500/20 border-green-500/50 text-green-500"
            : "bg-surface border-border text-foreground/60 hover:text-foreground hover:bg-surface-light"
        }`}
        aria-label={copied ? "Link copied!" : "Copy link"}
      >
        {copied ? (
          <svg
            className="w-[14px] h-[14px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            className="w-[14px] h-[14px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
