"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Purchase {
  id: string;
  user_id: string;
  sequence_ids: number[];
  total_amount: number;
  stripe_session_id: string;
  created_at: string;
  user_email?: string;
}

interface DashboardStats {
  totalPurchases: number;
  totalRevenue: number;
  uniqueCustomers: number;
  recentPurchases: Purchase[];
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setIsAdmin(user?.email === adminEmail);
      setIsLoading(false);

      if (user?.email === adminEmail) {
        fetchStats();
      }
    }

    checkAuth();
  }, [adminEmail]);

  async function fetchStats() {
    setStatsLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setStatsLoading(false);
      return;
    }

    try {
      // Fetch all purchases
      const { data: purchases, error } = await supabase
        .from("purchases")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate stats
      const totalRevenue =
        purchases?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;
      const uniqueCustomers = new Set(purchases?.map((p) => p.user_id)).size;

      setStats({
        totalPurchases: purchases?.length || 0,
        totalRevenue: totalRevenue / 100, // Convert cents to dollars
        uniqueCustomers,
        recentPurchases: purchases?.slice(0, 10) || [],
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-foreground/60 mb-6">
            Please sign in to access this page.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-foreground/60 mb-6">
            You don&apos;t have permission to access this page.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-xl transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-foreground/60">Welcome back, {user.email}</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-4 hover:border-accent/50 transition-colors group"
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold group-hover:text-accent transition-colors">
              Vercel Analytics
            </h3>
            <p className="text-sm text-foreground/60">View traffic data</p>
          </a>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-4 hover:border-accent/50 transition-colors group"
          >
            <div className="text-2xl mb-2">🗄️</div>
            <h3 className="font-semibold group-hover:text-accent transition-colors">
              Supabase
            </h3>
            <p className="text-sm text-foreground/60">Database & Auth</p>
          </a>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-4 hover:border-accent/50 transition-colors group"
          >
            <div className="text-2xl mb-2">💳</div>
            <h3 className="font-semibold group-hover:text-accent transition-colors">
              Stripe
            </h3>
            <p className="text-sm text-foreground/60">Payments & Revenue</p>
          </a>
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-4 hover:border-accent/50 transition-colors group"
          >
            <div className="text-2xl mb-2">☁️</div>
            <h3 className="font-semibold group-hover:text-accent transition-colors">
              Cloudflare
            </h3>
            <p className="text-sm text-foreground/60">CDN & R2 Storage</p>
          </a>
        </div>

        {/* Stats Overview */}
        {statsLoading ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div>
            <p className="mt-4 text-foreground/60">Loading stats...</p>
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-surface rounded-xl border border-border p-6">
                <div className="text-3xl font-bold text-accent mb-1">
                  ${stats.totalRevenue.toFixed(2)}
                </div>
                <div className="text-sm text-foreground/60">Total Revenue</div>
              </div>
              <div className="bg-surface rounded-xl border border-border p-6">
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stats.totalPurchases}
                </div>
                <div className="text-sm text-foreground/60">Total Orders</div>
              </div>
              <div className="bg-surface rounded-xl border border-border p-6">
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stats.uniqueCustomers}
                </div>
                <div className="text-sm text-foreground/60">
                  Unique Customers
                </div>
              </div>
            </div>

            {/* Recent Purchases */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-bold">Recent Purchases</h2>
              </div>
              {stats.recentPurchases.length === 0 ? (
                <div className="p-8 text-center text-foreground/60">
                  No purchases yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.recentPurchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {purchase.sequence_ids.length} sequence
                          {purchase.sequence_ids.length !== 1 ? "s" : ""}
                        </div>
                        <div className="text-sm text-foreground/60">
                          {new Date(purchase.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-accent">
                          ${(purchase.total_amount / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-foreground/50 font-mono">
                          {purchase.stripe_session_id?.slice(0, 20)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <p className="text-foreground/60">Unable to load stats</p>
            <button
              onClick={fetchStats}
              className="mt-4 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
