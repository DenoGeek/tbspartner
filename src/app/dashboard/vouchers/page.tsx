"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Voucher {
  id: string;
  rad_username: string;
  rad_password: string;
  expiry: string | null;
  total_packets_used: number;
  total_time_used: number;
  total_plan_packets: number;
  billing_plan: {
    id: string;
    display_name: string;
    price: number;
  };
  customer?: {
    id: string;
    account_no: string;
  };
}

interface Customer {
  id: string;
  account_no: string;
  user_details: {
    username: string;
    first_name: string;
    last_name: string;
  };
}

interface BillingPlan {
  id: string;
  display_name: string;
  price: number | string;
}

const ITEMS_PER_PAGE = 10;

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedBillingPlan, setSelectedBillingPlan] = useState<BillingPlan | null>(null);

  useEffect(() => {
    fetchVouchers();
    fetchCustomers();
    fetchBillingPlans();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.get<Voucher[]>("/api/v1/vouchers/my_customers_vouchers/");
      setVouchers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await apiClient.get<Customer[]>("/api/v1/customers/my_customers/");
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  };

  const fetchBillingPlans = async () => {
    try {
      const response = await apiClient.get<{ results: BillingPlan[] } | BillingPlan[]>("/api/v1/billing_plans/");
      const data = Array.isArray(response) ? response : response.results || [];
      setBillingPlans(data);
    } catch (err) {
      console.error("Failed to load billing plans:", err);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedBillingPlan(null);
    setError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedBillingPlan) {
      setError("Please select both customer and billing plan");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const submitData = {
        billing_id: selectedBillingPlan.id,
        customer_profile: selectedCustomer.id,
      };

      await apiClient.post("/api/v1/vouchers/purchase/", submitData);
      setDialogOpen(false);
      resetForm();
      await fetchVouchers();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.errors || err?.message || "Failed to create voucher";
      setError(typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setCreating(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(vouchers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedVouchers = vouchers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vouchers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and view vouchers for your customers
          </p>
        </div>
        <Button onClick={openCreateDialog}>Generate Voucher</Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-sm border border-destructive/20">
          {error}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Voucher</DialogTitle>
            <DialogDescription>
              Select a customer and billing plan to generate a voucher
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer *</label>
              <SearchableSelect
                options={customers}
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}
                getLabel={(customer) => 
                  `${customer.account_no} - ${customer.user_details?.first_name || ""} ${customer.user_details?.last_name || ""}`.trim() || customer.user_details?.username || customer.account_no
                }
                getValue={(customer) => customer.id}
                placeholder="Select a customer"
                searchPlaceholder="Search customers..."
                emptyMessage="No customers found"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Billing Plan *</label>
              <SearchableSelect
                options={billingPlans}
                value={selectedBillingPlan}
                onValueChange={setSelectedBillingPlan}
                getLabel={(plan) => {
                  const price = typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price;
                  return `${plan.display_name} - ${price.toFixed(2)}`;
                }}
                getValue={(plan) => plan.id}
                placeholder="Select a billing plan"
                searchPlaceholder="Search billing plans..."
                emptyMessage="No billing plans found"
                disabled={creating}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !selectedCustomer || !selectedBillingPlan}>
                {creating ? "Generating..." : "Generate Voucher"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-8">Loading vouchers...</div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No vouchers found. Generate your first voucher to get started.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-sm border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Billing Plan</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Data Used</TableHead>
                  <TableHead>Time Used</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>
                      {voucher.customer ? voucher.customer.account_no : "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {voucher.billing_plan.display_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {voucher.rad_username}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {voucher.rad_password}
                    </TableCell>
                    <TableCell>
                      {voucher.expiry
                        ? new Date(voucher.expiry).toLocaleString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {voucher.total_plan_packets > 0
                        ? `${formatBytes(voucher.total_packets_used)} / ${formatBytes(voucher.total_plan_packets)}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {formatTime(voucher.total_time_used)}
                    </TableCell>
                    <TableCell>
                      {voucher.expiry && new Date(voucher.expiry) > new Date()
                        ? "Active"
                        : "Expired"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

