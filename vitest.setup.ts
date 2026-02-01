import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { createElement } from 'react';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: function MockImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return createElement('img', { ...props, alt: props.alt || '' });
  },
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return createElement('a', { href }, children);
  },
}));
