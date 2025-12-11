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

interface CustomerProfile {
  id: string;
  account_no: string;
  balance: number;
  tarrif: string;
  customer_type: number;
  pppoe_username: string | null;
  ip_address: string | null;
  mac_address: string | null;
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
  const [creating, setCreating] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone_no: "",
    first_name: "",
    last_name: "",
    password: "",
    customer_type: "1",
    pppoe_username: "",
    pppoe_password: "",
    ip_address: "",
    mac_address: "",
    tarrif: "basic",
  });

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

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      phone_no: "",
      first_name: "",
      last_name: "",
      password: "",
      customer_type: "1",
      pppoe_username: "",
      pppoe_password: "",
      ip_address: "",
      mac_address: "",
      tarrif: "basic",
    });
    setEditingCustomerId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const loadCustomerForEdit = async (customerId: string) => {
    try {
      const customer = await apiClient.get<CustomerProfile>(`/api/v1/customers/${customerId}/`);
      setFormData({
        username: customer.user_details?.username || "",
        email: customer.user_details?.email || "",
        phone_no: customer.user_details?.phone_no || "",
        first_name: customer.user_details?.first_name || "",
        last_name: customer.user_details?.last_name || "",
        password: "", // Don't load password
        customer_type: customer.customer_type.toString(),
        pppoe_username: customer.pppoe_username || "",
        pppoe_password: "", // Don't load password
        ip_address: customer.ip_address || "",
        mac_address: customer.mac_address || "",
        tarrif: customer.tarrif || "basic",
      });
      setEditingCustomerId(customerId);
      setDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer");
    }
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      if (editingCustomerId) {
        // Update existing customer
        await apiClient.put(`/api/v1/customers/${editingCustomerId}/`, formData);
      } else {
        // Create new customer
        await apiClient.post("/api/v1/customers/", formData);
      }
      setDialogOpen(false);
      resetForm();
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Clear fields when customer type changes
      if (name === "customer_type") {
        if (value === "1") {
          // Hotspot: clear all networking fields
          updated.pppoe_username = "";
          updated.pppoe_password = "";
          updated.ip_address = "";
          updated.mac_address = "";
        } else if (value === "2") {
          // PPPoE: clear IP and MAC
          updated.ip_address = "";
          updated.mac_address = "";
        } else if (value === "3") {
          // Static: clear PPPoE and MAC
          updated.pppoe_username = "";
          updated.pppoe_password = "";
          updated.mac_address = "";
        } else if (value === "4") {
          // Home: clear PPPoE and IP
          updated.pppoe_username = "";
          updated.pppoe_password = "";
          updated.ip_address = "";
        }
      }
      return updated;
    });
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomerId ? "Edit Customer" : "Create New Customer"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomerId
                ? "Update customer profile and user details"
                : "Create a new customer profile with user details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCustomer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_no">Phone Number</Label>
                <Input
                  id="phone_no"
                  name="phone_no"
                  type="text"
                  value={formData.phone_no}
                  onChange={handleInputChange}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_type">Customer Type</Label>
                <select
                  id="customer_type"
                  name="customer_type"
                  value={formData.customer_type}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={creating}
                >
                  <option value="1">Hotspot</option>
                  <option value="2">PPPoE</option>
                  <option value="3">Static</option>
                  <option value="4">Home</option>
                </select>
              </div>
              {formData.customer_type === "2" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pppoe_username">
                      PPPoE Username <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pppoe_username"
                      name="pppoe_username"
                      type="text"
                      value={formData.pppoe_username}
                      onChange={handleInputChange}
                      disabled={creating}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pppoe_password">
                      PPPoE Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pppoe_password"
                      name="pppoe_password"
                      type="password"
                      value={formData.pppoe_password}
                      onChange={handleInputChange}
                      disabled={creating}
                      required
                    />
                  </div>
                </>
              )}
              {formData.customer_type === "3" && (
                <div className="space-y-2">
                  <Label htmlFor="ip_address">
                    IP Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ip_address"
                    name="ip_address"
                    type="text"
                    value={formData.ip_address}
                    onChange={handleInputChange}
                    disabled={creating}
                    required
                  />
                </div>
              )}
              {formData.customer_type === "4" && (
                <div className="space-y-2">
                  <Label htmlFor="mac_address">
                    MAC Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mac_address"
                    name="mac_address"
                    type="text"
                    value={formData.mac_address}
                    onChange={handleInputChange}
                    disabled={creating}
                    required
                  />
                </div>
              )}
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
                {creating
                  ? editingCustomerId
                    ? "Updating..."
                    : "Creating..."
                  : editingCustomerId
                    ? "Update Customer"
                    : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                        onClick={() => loadCustomerForEdit(customer.id)}
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
