"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { usePartnerUser } from "@/contexts/partner-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TransactionStats {
  total_transactions: number;
  total_amount: number;
  today: { count: number; amount: number };
  this_month: { count: number; amount: number };
  last_7_days: Array<{ date: string; amount: number; count: number }>;
  by_type: Record<number, { count: number; total: number }>;
  commission_balance?: number;
}

interface DashboardStats {
  customers: {
    total_customers: number;
    by_type: Record<number, number>;
    total_balance: number;
  };
  billing_plans: {
    total_plans: number;
    by_type: Record<number, number>;
    average_price: number;
    total_revenue_potential: number;
  };
  transactions: TransactionStats;
}

const CUSTOMER_TYPE_NAMES: Record<number, string> = {
  1: "Hotspot",
  2: "PPPoE",
  3: "Static",
  4: "Home",
};

const PLAN_TYPE_NAMES: Record<number, string> = {
  1: "Billing Plan",
  2: "Coupon",
};

const TRANSACTION_TYPE_NAMES: Record<number, string> = {
  1: "M-Pesa",
  2: "Purchase",
  3: "Invoice",
  4: "Cash",
  5: "Flutterwave",
  6: "Kopo Kopo",
  7: "Reversal",
  8: "Transfer",
  9: "Refund",
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const COMMISSION_TYPE_NAMES: Record<number, string> = {
  10: "Commission earn",
  11: "Commission pay out",
};

export default function DashboardPage() {
  const { partnerType, user, loading: userLoading } = usePartnerUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [commissionStats, setCommissionStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isMarketer = partnerType === "marketer";

  const handleCopyReferralCode = useCallback(() => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [user?.referral_code]);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      if (isMarketer) {
        const data = await apiClient.get<TransactionStats>("/api/v1/transactions/stats/");
        setCommissionStats(data);
        setStats(null);
      } else {
        const [customersStats, billingStats, transactionsStats] = await Promise.all([
          apiClient.get<DashboardStats["customers"]>("/api/v1/customers/stats/"),
          apiClient.get<DashboardStats["billing_plans"]>("/api/v1/billing_plans/stats/"),
          apiClient.get<TransactionStats>("/api/v1/transactions/stats/"),
        ]);
        setStats({
          customers: customersStats,
          billing_plans: billingStats,
          transactions: transactionsStats,
        });
        setCommissionStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  }, [isMarketer]);

  useEffect(() => {
    if (userLoading) return;
    fetchDashboardStats();
  }, [userLoading, fetchDashboardStats]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-sm border border-destructive/20">
        {error}
      </div>
    );
  }

  // Marketer dashboard: commission-focused cards + chart
  if (isMarketer && commissionStats) {
    const revenueChartData = commissionStats.last_7_days.map((day) => ({
      date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: day.amount,
      count: day.count,
    }));
    const commissionBalance = commissionStats.commission_balance ?? 0;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your commissions
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your referral code</CardTitle>
            <CardDescription>
              Share this code so you earn commissions on referred activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-row flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-lg font-semibold">
              {user?.referral_code ?? "No referral code assigned"}
            </span>
            {user?.referral_code ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReferralCode}
              >
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{commissionStats.total_amount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {commissionStats.total_transactions} commission transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{commissionBalance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Available balance
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {commissionStats.this_month.amount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {commissionStats.this_month.count} transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {commissionStats.today.amount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {commissionStats.today.count} transactions
              </p>
            </CardContent>
          </Card>
        </div>
        {revenueChartData.some((d) => d.amount > 0 || d.count > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Commissions (Last 7 Days)</CardTitle>
              <CardDescription>Daily commission amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Amount"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ISP dashboard: full stats
  if (!stats) {
    return null;
  }

  // Prepare chart data
  const customerTypeData = Object.entries(stats.customers.by_type).map(([type, count]) => ({
    name: CUSTOMER_TYPE_NAMES[Number(type)] || `Type ${type}`,
    value: count,
  }));

  const planTypeData = Object.entries(stats.billing_plans.by_type).map(([type, count]) => ({
    name: PLAN_TYPE_NAMES[Number(type)] || `Type ${type}`,
    value: count,
  }));

  const transactionTypeData = Object.entries(stats.transactions.by_type).map(([type, data]) => ({
    name: TRANSACTION_TYPE_NAMES[Number(type)] || COMMISSION_TYPE_NAMES[Number(type)] || `Type ${type}`,
    count: data.count,
    amount: data.total,
  }));

  // Format last 7 days data for chart
  const revenueChartData = stats.transactions.last_7_days.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    amount: day.amount,
    count: day.count,
  }));

  return (
    <div className="space-y-6">
    <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your customers, billing plans, and transactions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customers.total_customers}</div>
            <p className="text-xs text-muted-foreground">
              Total balance: {stats.customers.total_balance.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billing Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.billing_plans.total_plans}</div>
            <p className="text-xs text-muted-foreground">
              Avg price: {stats.billing_plans.average_price.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactions.total_transactions}</div>
            <p className="text-xs text-muted-foreground">
              Total amount: {stats.transactions.total_amount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.transactions.this_month.amount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.transactions.this_month.count} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
            <CardDescription>Daily transaction amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customers by Type</CardTitle>
            <CardDescription>Distribution of customer types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {customerTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing Plans by Type</CardTitle>
            <CardDescription>Distribution of plan types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {planTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactions by Type</CardTitle>
            <CardDescription>Transaction counts by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transactionTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transactions:</span>
                <span className="font-semibold">{stats.transactions.today.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">
                  {stats.transactions.today.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transactions:</span>
                <span className="font-semibold">{stats.transactions.this_month.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">
                  {stats.transactions.this_month.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Plans:</span>
                <span className="font-semibold">{stats.billing_plans.total_plans}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue Potential:</span>
                <span className="font-semibold">
                  {stats.billing_plans.total_revenue_potential.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
