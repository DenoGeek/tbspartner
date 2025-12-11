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

interface ClientNas {
  id: string;
  name: string;
  nas_ip: string;
}

interface Customer {
  id: string;
  account_no: string;
}

const ITEMS_PER_PAGE = 10;

// Data bands for MikroTik speeds
const MIKROTIK_DATA_BANDS = [
  { value: 0, text: "Unlimited" },
  { value: 128000, text: "128 Kbps" },
  { value: 256000, text: "256 Kbps" },
  { value: 512000, text: "512 Kbps" },
  { value: 768000, text: "0.75 Mbps" },
  { value: 1024000, text: "1 Mbps" },
  { value: 2048000, text: "2 Mbps" },
  { value: 3072000, text: "3 Mbps" },
  { value: 4096000, text: "4 Mbps" },
  { value: 5120000, text: "5 Mbps" },
  { value: 6144000, text: "6 Mbps" },
  { value: 7168000, text: "7 Mbps" },
  { value: 8192000, text: "8 Mbps" },
  { value: 10240000, text: "10 Mbps" },
  { value: 12288000, text: "12 Mbps" },
  { value: 15360000, text: "15 Mbps" },
  { value: 20480000, text: "20 Mbps" },
  { value: 22528000, text: "22 Mbps" },
  { value: 25600000, text: "25 Mbps" },
  { value: 30720000, text: "30 Mbps" },
  { value: 40960000, text: "40 Mbps" },
  { value: 51200000, text: "50 Mbps" },
  { value: 61440000, text: "60 Mbps" },
  { value: 71680000, text: "70 Mbps" },
  { value: 81920000, text: "80 Mbps" },
  { value: 92160000, text: "90 Mbps" },
  { value: 102400000, text: "100 Mbps" },
  { value: 153600000, text: "150 Mbps" },
  { value: 204800000, text: "200 Mbps" },
];

const TIME_BANDS = [
  { value: "minutes", text: "Minute(s)" },
  { value: "hour", text: "Hour(s)" },
  { value: "day", text: "Day(s)" },
  { value: "week", text: "Week(s)" },
  { value: "month", text: "Month(s)" },
];

const PACKET_BANDS = [
  { value: "mega", text: "MB(s)" },
  { value: "giga", text: "GB(s)" },
];

const INTERVAL_BANDS = [
  { value: "daily", text: "Daily" },
  { value: "weekly", text: "Weekly" },
  { value: "monthly", text: "Monthly" },
  { value: "yearly", text: "Yearly" },
  { value: "unlimited", text: "Unlimited" },
];

export default function BillingPlansPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nases, setNases] = useState<ClientNas[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);

  const [formData, setFormData] = useState({
    rad_group_name: "",
    plan_type: 1,
    bill_by: "time",
    value: 0,
    value_type: "minutes",
    valid_for: 0,
    valid_for_type: "minutes",
    price: 0,
    display_name: "",
    bw_upload: 0,
    bw_download: 0,
    max_purchase: 0,
    interval: "daily",
    simultaneous_use: 1,
    nas: "",
    coupon_expiry_date: "",
    customers: [] as string[],
  });

  useEffect(() => {
    fetchPlans();
    fetchNases();
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

  const fetchNases = async () => {
    try {
      const response = await apiClient.get<{ results: ClientNas[] } | ClientNas[]>("/api/v1/nas/");
      // Handle paginated response or direct array
      const nasesData = Array.isArray(response) ? response : response.results || [];
      setNases(nasesData);
    } catch (err) {
      console.error("Failed to fetch NAS devices:", err);
    }
  };

  const fetchCustomerSuggestions = async (search: string) => {
    if (!search || search.length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    try {
      const data = await apiClient.get<Customer[]>(
        `/api/v1/customers/my_customers/?search=${encodeURIComponent(search)}`
      );
      setCustomerSuggestions(data.filter((c) => !selectedCustomers.find((sc) => sc.id === c.id)));
    } catch (err) {
      console.error("Failed to fetch customer suggestions:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      rad_group_name: "",
      plan_type: 1,
      bill_by: "time",
      value: 0,
      value_type: "minutes",
      valid_for: 0,
      valid_for_type: "minutes",
      price: 0,
      display_name: "",
      bw_upload: 0,
      bw_download: 0,
      max_purchase: 0,
      interval: "daily",
      simultaneous_use: 1,
      nas: "",
      coupon_expiry_date: "",
      customers: [],
    });
    setSelectedCustomers([]);
    setCustomerSearchTerm("");
    setEditingPlanId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const loadPlanForEdit = async (planId: string) => {
    try {
      const plan = await apiClient.get<BillingPlan>(`/api/v1/billing_plans/${planId}/`);
      setFormData({
        rad_group_name: plan.rad_group_name || "",
        plan_type: plan.plan_type,
        bill_by: plan.bill_by || "time",
        value: plan.value || 0,
        value_type: plan.value_type || "minutes",
        valid_for: plan.valid_for || 0,
        valid_for_type: plan.valid_for_type || "minutes",
        price: plan.price || 0,
        display_name: plan.display_name || "",
        bw_upload: plan.bw_upload || 0,
        bw_download: plan.bw_download || 0,
        max_purchase: plan.max_purchase || 0,
        interval: plan.interval || "daily",
        simultaneous_use: plan.simultaneous_use || 1,
        nas: plan.nas || "",
        coupon_expiry_date: plan.coupon_expiry_date
          ? new Date(plan.coupon_expiry_date).toISOString().split("T")[0]
          : "",
        customers: plan.customers || [],
      });
      setEditingPlanId(planId);
      setDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing plan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const submitData: any = {
        ...formData,
        customers: selectedCustomers.map((c) => c.id),
      };

      // Handle coupon_expiry_date - convert date string to datetime format
      if (submitData.plan_type === 2 && submitData.coupon_expiry_date) {
        // Convert YYYY-MM-DD to YYYY-MM-DDTHH:mm:ss format (ISO datetime)
        submitData.coupon_expiry_date = `${submitData.coupon_expiry_date}T00:00:00`;
      } else {
        // Remove coupon_expiry_date if not a coupon or if empty
        delete submitData.coupon_expiry_date;
      }

      // Convert empty string nas to null
      if (submitData.nas === "") {
        submitData.nas = null;
      }

      // Convert numeric strings to numbers for numeric fields
      submitData.plan_type = Number(submitData.plan_type);
      submitData.value = Number(submitData.value);
      submitData.valid_for = Number(submitData.valid_for);
      submitData.price = Number(submitData.price);
      submitData.bw_upload = Number(submitData.bw_upload);
      submitData.bw_download = Number(submitData.bw_download);
      submitData.max_purchase = Number(submitData.max_purchase);
      submitData.simultaneous_use = Number(submitData.simultaneous_use);

      if (editingPlanId) {
        await apiClient.put(`/api/v1/billing_plans/${editingPlanId}/`, submitData);
      } else {
        await apiClient.post("/api/v1/billing_plans/", submitData);
      }
      setDialogOpen(false);
      resetForm();
      await fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save billing plan");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addCustomer = (customer: Customer) => {
    if (!selectedCustomers.find((c) => c.id === customer.id)) {
      setSelectedCustomers([...selectedCustomers, customer]);
      setCustomerSearchTerm("");
      setCustomerSuggestions([]);
    }
  };

  const removeCustomer = (customerId: string) => {
    setSelectedCustomers(selectedCustomers.filter((c) => c.id !== customerId));
  };

  const valueTypes = formData.bill_by === "time" ? TIME_BANDS : PACKET_BANDS;

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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlanId ? "Edit Billing Plan" : "Create New Billing Plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlanId
                ? "Update billing plan details"
                : "Create a new billing plan with pricing and bandwidth settings"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rad_group_name">Plan Name *</Label>
                <Input
                  id="rad_group_name"
                  name="rad_group_name"
                  type="text"
                  value={formData.rad_group_name}
                  onChange={handleInputChange}
                  required
                  disabled={saving || !!editingPlanId}
                  placeholder="daily_plan_fast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan_type">Billing Plan Type</Label>
                <select
                  id="plan_type"
                  name="plan_type"
                  value={formData.plan_type}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  <option value={1}>Billing plan</option>
                  <option value={2}>Coupon</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill_by">Type</Label>
                <select
                  id="bill_by"
                  name="bill_by"
                  value={formData.bill_by}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  <option value="time">Time</option>
                  <option value="packet">Packets</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>
                  {formData.bill_by === "time"
                    ? "Time plan goes online"
                    : "Total bandwidth to transmit"}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                  <select
                    name="value_type"
                    value={formData.value_type}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={saving}
                  >
                    {valueTypes.map((band) => (
                      <option key={band.value} value={band.value}>
                        {band.text}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Expires{" "}
                  {formData.valid_for_type === "monthly" ? "on date" : "after"}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    name="valid_for"
                    value={formData.valid_for}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                  <select
                    name="valid_for_type"
                    value={formData.valid_for_type}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={saving}
                  >
                    {TIME_BANDS.map((band) => (
                      <option key={band.value} value={band.value}>
                        {band.text}
                      </option>
                    ))}
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.0001"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bw_upload">Max Upload Speed</Label>
                <select
                  id="bw_upload"
                  name="bw_upload"
                  value={formData.bw_upload}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {MIKROTIK_DATA_BANDS.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.text}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bw_download">Max Download Speed</Label>
                <select
                  id="bw_download"
                  name="bw_download"
                  value={formData.bw_download}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {MIKROTIK_DATA_BANDS.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.text}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_purchase">Max Number of Purchases</Label>
                <Input
                  id="max_purchase"
                  name="max_purchase"
                  type="number"
                  value={formData.max_purchase}
                  onChange={handleInputChange}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Over Period of</Label>
                <select
                  id="interval"
                  name="interval"
                  value={formData.interval}
                  onChange={handleInputChange}
                  disabled={saving || formData.max_purchase <= 0}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {INTERVAL_BANDS.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.text}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name *</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="simultaneous_use">Simultaneous Use</Label>
                <Input
                  id="simultaneous_use"
                  name="simultaneous_use"
                  type="number"
                  value={formData.simultaneous_use}
                  onChange={handleInputChange}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nas">NAS</Label>
                <select
                  id="nas"
                  name="nas"
                  value={formData.nas}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                >
                  <option value="">None</option>
                  {nases.map((nas) => (
                    <option key={nas.id} value={nas.id}>
                      {nas.name}
                    </option>
                  ))}
                </select>
              </div>
              {formData.plan_type === 2 && (
                <div className="space-y-2">
                  <Label htmlFor="coupon_expiry_date">Coupon Expiry Date</Label>
                  <Input
                    id="coupon_expiry_date"
                    name="coupon_expiry_date"
                    type="date"
                    value={formData.coupon_expiry_date}
                    onChange={handleInputChange}
                    disabled={saving}
                  />
                </div>
              )}
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Customers</Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Start typing to search customers..."
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    fetchCustomerSuggestions(e.target.value);
                  }}
                  disabled={saving}
                />
                {customerSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {customerSuggestions.map((customer) => (
                      <li
                        key={customer.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => addCustomer(customer)}
                      >
                        {customer.account_no}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedCustomers.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-2">Selected customers:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomers.map((customer) => (
                      <span
                        key={customer.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                      >
                        {customer.account_no}
                        <button
                          type="button"
                          onClick={() => removeCustomer(customer.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? editingPlanId
                    ? "Updating..."
                    : "Creating..."
                  : editingPlanId
                    ? "Update Plan"
                    : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
