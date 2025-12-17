"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BillingPlanFormDialog } from "./billing-plan-form-dialog";

interface BillingPlan {
  id: string;
  rad_group_name: string;
  plan_type: number;
  bill_by: string;
  value: number;
  value_type: string;
  valid_for: number;
  valid_for_type: string;
  price: number;
  display_name: string;
  bw_upload: number;
  bw_download: number;
  max_purchase: number;
  interval: string;
  simultaneous_use: number;
  nas: string | null;
  coupon_expiry_date: string | null;
  customers: string[];
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function BillingPlansPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get<{ results: BillingPlan[] } | BillingPlan[]>("/api/v1/billing_plans/");
      // Handle paginated response or direct array
      const plansData = Array.isArray(response) ? response : response.results || [];
      setPlans(plansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch billing plans");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPlanId(null);
    setDialogOpen(true);
  };

  const loadPlanForEdit = async (planId: string) => {
    setEditingPlanId(planId);
    setDialogOpen(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(plans.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPlans = plans.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
    <div>
          <h1 className="text-2xl font-semibold">Billing Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your billing plans and pricing
          </p>
        </div>
        <Button onClick={openCreateDialog}>Create Billing Plan</Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-sm border border-destructive/20">
          {error}
        </div>
      )}

      <BillingPlanFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPlanId(null);
          }
          setDialogOpen(open);
        }}
        editingPlanId={editingPlanId}
        onSaved={fetchPlans}
      />

      {loading ? (
        <div className="text-center py-8">Loading billing plans...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No billing plans found. Create your first billing plan to get started.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Bill By</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Valid For</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      {plan.rad_group_name}
                    </TableCell>
                    <TableCell>{plan.display_name}</TableCell>
                    <TableCell>
                      {plan.plan_type === 1 ? "Billing Plan" : "Coupon"}
                    </TableCell>
                    <TableCell>{plan.price}</TableCell>
                    <TableCell>{plan.bill_by}</TableCell>
                    <TableCell>
                      {plan.value} {plan.value_type}
                    </TableCell>
                    <TableCell>
                      {plan.valid_for} {plan.valid_for_type}
                    </TableCell>
                    <TableCell>
                      {new Date(plan.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPlanForEdit(plan.id)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, plans.length)} of{" "}
                {plans.length} plans
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page}>...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
