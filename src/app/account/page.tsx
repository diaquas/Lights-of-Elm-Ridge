"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-foreground/60">
            Manage your account and view your purchases
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-surface rounded-xl p-6 border border-border mb-8">
          <h2 className="text-xl font-bold mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-foreground/60 text-sm">Email</span>
              <p className="text-foreground">{user.email}</p>
            </div>
            <div>
              <span className="text-foreground/60 text-sm">Member since</span>
              <p className="text-foreground">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Purchased Sequences */}
        <div className="bg-surface rounded-xl p-6 border border-border mb-8">
          <h2 className="text-xl font-bold mb-4">My Sequences</h2>
          <div className="text-center py-8 text-foreground/60">
            <svg
              className="w-12 h-12 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="mb-4">
              You haven&apos;t purchased any sequences yet.
            </p>
            <Link
              href="/sequences"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
            >
              Browse Sequences
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            &larr; Back to home
          </Link>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-surface hover:bg-surface-light text-foreground border border-border rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
