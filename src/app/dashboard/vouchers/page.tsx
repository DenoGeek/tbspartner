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

interface RadAcctSession {
  radacctid: number;
  acctsessionid: string;
  acctuniqueid: string;
  username: string;
  realm: string | null;
  nasipaddress: string | null;
  nasportid: string | null;
  nasporttype: string | null;
  acctstarttime: string | null;
  acctupdatetime: string | null;
  acctstoptime: string | null;
  acctinterval: number | null;
  acctsessiontime: number | null;
  acctauthentic: string | null;
  connectinfo_start: string | null;
  connectinfo_stop: string | null;
  acctinputoctets: number | null;
  acctoutputoctets: number | null;
  calledstationid: string | null;
  callingstationid: string | null;
  acctterminatecause: string | null;
  servicetype: string | null;
  framedprotocol: string | null;
  framedipaddress: string | null;
  framedipv6address: string | null;
  framedipv6prefix: string | null;
  framedinterfaceid: string | null;
  delegatedipv6prefix: string | null;
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
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [selectedVoucherUsername, setSelectedVoucherUsername] = useState<string | null>(null);
  const [sessions, setSessions] = useState<RadAcctSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

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

      await apiClient.post("/api/v1/vouchers/partner_purchase/", submitData);
      setDialogOpen(false);
      resetForm();
      await fetchVouchers();
    } catch (err: unknown) {
      // Handle validation errors from the API
      // apiClient uses fetch, so error structure is: { data: {...}, status: number, message: string }
      const apiError = err as { data?: { errors?: unknown; non_field_errors?: unknown } | unknown; status?: number; message?: string };
      
      // Check both apiError.data.errors and apiError.data directly
      // Sometimes errors are in data.errors, sometimes directly in data
      const errorData = apiError?.data;
      let errors: unknown = undefined;
      
      if (errorData && typeof errorData === 'object') {
        // Check if errors are nested in an 'errors' property
        if ('errors' in errorData) {
          errors = (errorData as { errors?: unknown }).errors;
        } else if ('non_field_errors' in errorData || Object.keys(errorData).length > 0) {
          // Errors might be directly in data (like { non_field_errors: [...] })
          errors = errorData;
        }
      }
      
      if (errors) {
        // If it's an object with field errors, extract and format them
        if (typeof errors === "object" && !Array.isArray(errors)) {
          const errorMessages: string[] = [];
          const errorObj = errors as Record<string, unknown>;
          
          // Handle non_field_errors (general validation errors)
          if (errorObj.non_field_errors) {
            const nonFieldErrors = Array.isArray(errorObj.non_field_errors) 
              ? errorObj.non_field_errors 
              : [errorObj.non_field_errors];
            // Clean up error messages - remove extra quotes and brackets
            nonFieldErrors.forEach((e) => {
              let errorMsg = String(e);
              // Remove surrounding brackets and quotes if present
              errorMsg = errorMsg.replace(/^\[['"]|['"]\]$/g, '');
              errorMsg = errorMsg.replace(/^['"]|['"]$/g, '');
              if (errorMsg.trim()) {
                errorMessages.push(errorMsg.trim());
              }
            });
          }
          
          // Handle field-specific errors
          Object.keys(errorObj).forEach((key) => {
            if (key !== "non_field_errors") {
              const fieldErrors = Array.isArray(errorObj[key]) 
                ? errorObj[key] as unknown[] 
                : [errorObj[key]];
              fieldErrors.forEach((msg) => {
                let errorMsg = String(msg);
                // Clean up error messages
                errorMsg = errorMsg.replace(/^\[['"]|['"]\]$/g, '');
                errorMsg = errorMsg.replace(/^['"]|['"]$/g, '');
                if (errorMsg.trim()) {
                  errorMessages.push(`${key}: ${errorMsg.trim()}`);
                }
              });
            }
          });
          
          setError(errorMessages.length > 0 ? errorMessages.join(". ") : "Validation failed");
        } else if (Array.isArray(errors)) {
          const cleanedErrors = errors.map(e => {
            let errorMsg = String(e);
            errorMsg = errorMsg.replace(/^\[['"]|['"]\]$/g, '');
            errorMsg = errorMsg.replace(/^['"]|['"]$/g, '');
            return errorMsg.trim();
          }).filter(e => e);
          setError(cleanedErrors.join(". "));
        } else {
          let errorMsg = String(errors);
          errorMsg = errorMsg.replace(/^\[['"]|['"]\]$/g, '');
          errorMsg = errorMsg.replace(/^['"]|['"]$/g, '');
          setError(errorMsg.trim() || "Failed to create voucher");
        }
      } else {
        // Fallback to message or status text
        setError(apiError?.message || "Failed to create voucher");
      }
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

  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const handleViewSessions = async (radUsername: string) => {
    setSelectedVoucherUsername(radUsername);
    setSessionsDialogOpen(true);
    setSessionsLoading(true);
    setSessions([]);

    try {
      const data = await apiClient.get<RadAcctSession[]>(
        `/api/v1/vouchers/voucher_rad_acct_sessions/?username=${encodeURIComponent(radUsername)}`
      );
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
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

      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            // Clear error when dialog is closed
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Voucher</DialogTitle>
            <DialogDescription>
              Select a customer and billing plan to generate a voucher
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-sm border border-destructive/20 text-sm">
                {error}
              </div>
            )}
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      {voucher.expiry && new Date(voucher.expiry) > new Date()
                        ? "Active"
                        : "Expired"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewSessions(voucher.rad_username)}
                      >
                        View Sessions
                      </Button>
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

      {/* Sessions Dialog */}
      <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
        <DialogContent className="!max-w-[91.666667%] sm:!max-w-[91.666667%] md:!max-w-[75%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Sessions for {selectedVoucherUsername}
            </DialogTitle>
            <DialogDescription>
              View all RadAcct sessions for this voucher
            </DialogDescription>
          </DialogHeader>
          {sessionsLoading ? (
            <div className="text-center py-8">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions found for this voucher.
            </div>
          ) : (
            <div className="rounded-sm border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Stop Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>NAS IP</TableHead>
                    <TableHead>Upload</TableHead>
                    <TableHead>Download</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Terminate Cause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const upload = session.acctinputoctets || 0;
                    const download = session.acctoutputoctets || 0;
                    const total = upload + download;
                    return (
                      <TableRow key={session.radacctid}>
                        <TableCell className="font-mono text-xs">
                          {session.acctsessionid}
                        </TableCell>
                        <TableCell>
                          {session.acctstarttime
                            ? new Date(session.acctstarttime).toLocaleString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {session.acctstoptime
                            ? new Date(session.acctstoptime).toLocaleString()
                            : "Active"}
                        </TableCell>
                        <TableCell>
                          {formatTime(session.acctsessiontime)}
                        </TableCell>
                        <TableCell>{session.nasipaddress || "N/A"}</TableCell>
                        <TableCell>{formatBytes(upload)}</TableCell>
                        <TableCell>{formatBytes(download)}</TableCell>
                        <TableCell className="font-medium">
                          {formatBytes(total)}
                        </TableCell>
                        <TableCell>
                          {session.acctterminatecause || "N/A"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSessionsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

