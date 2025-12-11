"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface PaymentTransaction {
  id: string;
  amount: number;
  balance: number;
  type: number;
  type_display: string;
  narrative: string;
  customer: string | null;
  customer_account_no: string | null;
  customer_name: string | null;
  reversed: boolean;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: string;
  account_no: string;
  user_details?: {
    username: string;
    first_name: string;
    last_name: string;
  };
}

const ITEMS_PER_PAGE = 10;

const TRANSACTION_TYPES: Record<number, string> = {
  1: "M-Pesa Top up",
  2: "Purchase plan",
  3: "Invoice clearance",
  4: "Cash payment",
  5: "Flutter wave",
  6: "Kopo kopo",
  7: "Payment reversal",
  8: "Balance transfer",
  9: "Voucher refund",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [formData, setFormData] = useState({
    customer: "",
    amount: "",
    narrative: "",
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchCustomers();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get<{ results: PaymentTransaction[] } | PaymentTransaction[]>("/api/v1/transactions/");
      const transactionsData = Array.isArray(response) ? response : response.results || [];
      setTransactions(transactionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get<{ results: Customer[] } | Customer[]>("/api/v1/customers/my_customers/");
      const customersData = Array.isArray(response) ? response : response.results || [];
      setCustomers(customersData);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      customer: "",
      amount: "",
      narrative: "",
    });
    setSelectedCustomer(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setError("Please select a customer");
      return;
    }
    setCreating(true);
    setError("");

    try {
      const submitData = {
        customer: selectedCustomer.id,
        amount: Number(formData.amount),
        narrative: formData.narrative || undefined,
        type: 4, // Cash payment - will be forced by backend
      };

      await apiClient.post("/api/v1/transactions/", submitData);
      setDialogOpen(false);
      resetForm();
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Pagination calculations
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage payment transactions for your customers
          </p>
        </div>
        <Button onClick={openCreateDialog}>Record Cash Payment</Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-sm border border-destructive/20">
          {error}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Cash Payment</DialogTitle>
            <DialogDescription>
              Record a cash payment for one of your customers
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <SearchableSelect
                options={customers}
                value={selectedCustomer}
                onValueChange={(customer) => {
                  setSelectedCustomer(customer);
                  setFormData((prev) => ({ ...prev, customer: customer?.id || "" }));
                }}
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
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleInputChange}
                required
                disabled={creating}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="narrative">Narrative (Optional)</Label>
              <Input
                id="narrative"
                name="narrative"
                type="text"
                value={formData.narrative}
                onChange={handleInputChange}
                disabled={creating}
                placeholder="Payment description"
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
              <Button type="submit" disabled={creating}>
                {creating ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-8">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No transactions found. Record your first cash payment to get started.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Account No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Narrative</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{transaction.customer_name || "N/A"}</TableCell>
                    <TableCell className="font-medium">
                      {transaction.customer_account_no || "N/A"}
                    </TableCell>
                    <TableCell>{transaction.type_display}</TableCell>
                    <TableCell
                      className={
                        transaction.amount >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {transaction.amount >= 0 ? "+" : ""}
                      {transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{transaction.balance.toFixed(2)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.narrative || "N/A"}
                    </TableCell>
                    <TableCell>
                      {transaction.reversed ? (
                        <span className="text-red-600">Reversed</span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
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
                Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of{" "}
                {transactions.length} transactions
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

