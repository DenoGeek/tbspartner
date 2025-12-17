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
import { CustomerFormDialog } from "./customer-form-dialog";

interface CustomerProfile {
  id: string;
  account_no: string;
  balance: number;
  tarrif: string;
  customer_type: number;
  pppoe_username: string | null;
  pppoe_password?: string | null;
  ip_address: string | null;
  mac_address: string | null;
  default_plan: string | null;
  user_details: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_no: string;
  };
  created_by_details: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 10;

const CUSTOMER_TYPE_NAMES: Record<number, string> = {
  1: "Hotspot",
  2: "PPPoE",
  3: "Static",
  4: "Home",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.get<CustomerProfile[]>("/api/v1/customers/my_customers/");
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingCustomerId(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customerId: string) => {
    setEditingCustomerId(customerId);
    setDialogOpen(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCustomers = customers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
    <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your customers and their profiles
          </p>
        </div>
        <Button onClick={openCreateDialog}>Create Customer</Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-sm border border-destructive/20">
          {error}
        </div>
      )}

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCustomerId(null);
          }
          setDialogOpen(open);
        }}
        editingCustomerId={editingCustomerId}
        onSaved={fetchCustomers}
      />

      {loading ? (
        <div className="text-center py-8">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No customers found. Create your first customer to get started.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.account_no}
                    </TableCell>
                    <TableCell>
                      {customer.user_details?.first_name}{" "}
                      {customer.user_details?.last_name}
                    </TableCell>
                    <TableCell>{customer.user_details?.username}</TableCell>
                    <TableCell>{customer.user_details?.email || "N/A"}</TableCell>
                    <TableCell>{customer.user_details?.phone_no || "N/A"}</TableCell>
                    <TableCell>
                      {CUSTOMER_TYPE_NAMES[customer.customer_type] || "Unknown"}
                    </TableCell>
                    <TableCell>{customer.balance.toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(customer.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCustomer(customer.id)}
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
                Showing {startIndex + 1} to {Math.min(endIndex, customers.length)} of{" "}
                {customers.length} customers
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
                    // Show first page, last page, current page, and pages around current
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
