"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
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

interface BillingPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlanId: string | null;
  onSaved: () => Promise<void> | void;
}

interface BillingPlanDetail {
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

// Zod schema for client-side validation of the billing plan payload
const billingPlanSchema = z.object({
  rad_group_name: z.string().min(1, "Plan name is required"),
  display_name: z.string().min(1, "Display name is required"),
  plan_type: z.number().int().min(1).max(2),
  bill_by: z.enum(["time", "packet"]),
  value: z
    .number()
    .nonnegative("Value must be greater than or equal to 0"),
  valid_for: z
    .number()
    .nonnegative("Valid for must be greater than or equal to 0"),
  price: z
    .number()
    .nonnegative("Price must be greater than or equal to 0"),
});

type BillingPlanFormData = {
  rad_group_name: string;
  plan_type: number;
  bill_by: "time" | "packet";
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
  nas: string;
  coupon_expiry_date: string;
  customers: string[];
};

export function BillingPlanFormDialog({
  open,
  onOpenChange,
  editingPlanId,
  onSaved,
}: BillingPlanFormDialogProps) {
  const [formData, setFormData] = useState<BillingPlanFormData>({
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
  const [nases, setNases] = useState<ClientNas[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const valueTypes = formData.bill_by === "time" ? TIME_BANDS : PACKET_BANDS;

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
    setCustomerSuggestions([]);
    setValidationErrors({});
    setFormError("");
  };

  useEffect(() => {
    const fetchNases = async () => {
      try {
        const response = await apiClient.get<{ results: ClientNas[] } | ClientNas[]>(
          "/api/v1/nas/",
        );
        const nasesData = Array.isArray(response) ? response : response.results || [];
        setNases(nasesData);
      } catch (err) {
        console.error("Failed to fetch NAS devices:", err);
      }
    };

    fetchNases();
  }, []);

  useEffect(() => {
    const loadPlanForEdit = async (planId: string) => {
      try {
        const plan = await apiClient.get<BillingPlanDetail>(
          `/api/v1/billing_plans/${planId}/`,
        );
        setFormData({
          rad_group_name: plan.rad_group_name || "",
          plan_type: plan.plan_type,
          bill_by: (plan.bill_by as "time" | "packet") || "time",
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
        setSelectedCustomers([]); // Customers list is optional; keep selection empty by default
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Failed to load billing plan",
        );
      }
    };

    if (open && editingPlanId) {
      loadPlanForEdit(editingPlanId);
    }

    if (open && !editingPlanId) {
      resetForm();
    }

    if (!open) {
      setValidationErrors({});
      setFormError("");
    }
  }, [open, editingPlanId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        e.target.type === "number"
          ? Number(value)
          : name === "plan_type"
          ? Number(value)
          : value,
    }));
  };

  const fetchCustomerSuggestions = async (search: string) => {
    if (!search || search.length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    try {
      const data = await apiClient.get<Customer[]>(
        `/api/v1/customers/my_customers/?search=${encodeURIComponent(search)}`,
      );
      setCustomerSuggestions(
        data.filter(
          (c) => !selectedCustomers.find((sc) => sc.id === c.id),
        ),
      );
    } catch (err) {
      console.error("Failed to fetch customer suggestions:", err);
    }
  };

  const addCustomer = (customer: Customer) => {
    if (!selectedCustomers.find((c) => c.id === customer.id)) {
      setSelectedCustomers((prev) => [...prev, customer]);
      setCustomerSearchTerm("");
      setCustomerSuggestions([]);
    }
  };

  const removeCustomer = (customerId: string) => {
    setSelectedCustomers((prev) => prev.filter((c) => c.id !== customerId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setValidationErrors({});

    try {
      const submitData: any = {
        ...formData,
        customers: selectedCustomers.map((c) => c.id),
      };

      // Handle coupon_expiry_date - convert date string to datetime format
      if (submitData.plan_type === 2 && submitData.coupon_expiry_date) {
        submitData.coupon_expiry_date = `${submitData.coupon_expiry_date}T00:00:00`;
      } else {
        delete submitData.coupon_expiry_date;
      }

      if (submitData.nas === "") {
        submitData.nas = null;
      }

      submitData.plan_type = Number(submitData.plan_type);
      submitData.value = Number(submitData.value);
      submitData.valid_for = Number(submitData.valid_for);
      submitData.price = Number(submitData.price);
      submitData.bw_upload = Number(submitData.bw_upload);
      submitData.bw_download = Number(submitData.bw_download);
      submitData.max_purchase = Number(submitData.max_purchase);
      submitData.simultaneous_use = Number(submitData.simultaneous_use);

      const parseResult = billingPlanSchema.safeParse(submitData);
      if (!parseResult.success) {
        const fieldErrors: Record<string, string> = {};
        const flattened = parseResult.error.flatten();
        for (const [field, messages] of Object.entries(
          flattened.fieldErrors,
        )) {
          if (messages && messages.length > 0) {
            fieldErrors[field] = messages[0];
          }
        }
        setValidationErrors(fieldErrors);
        setSaving(false);
        return;
      }

      let response: BillingPlanDetail | null = null;
      if (editingPlanId) {
        response = await apiClient.put<BillingPlanDetail>(
          `/api/v1/billing_plans/${editingPlanId}/`,
          submitData,
        );
      } else {
        response = await apiClient.post<BillingPlanDetail>(
          "/api/v1/billing_plans/",
          submitData,
        );
      }

      if (!response || !response.id) {
        setFormError("Billing plan saved but response was missing an id.");
        setSaving(false);
        return;
      }

      await onSaved();
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      const fieldErrors: Record<string, string> = {};
      const generalMessages: string[] = [];
      const data = err?.data;

      if (data && typeof data === "object") {
        const formFields = new Set([
          "rad_group_name",
          "display_name",
          "plan_type",
          "bill_by",
          "value",
          "valid_for",
          "price",
          "bw_upload",
          "bw_download",
          "max_purchase",
          "interval",
          "simultaneous_use",
          "nas",
          "coupon_expiry_date",
        ]);

        Object.entries(data).forEach(([key, value]) => {
          const messagesArray = Array.isArray(value) ? value : [value];
          const text = messagesArray
            .filter(Boolean)
            .map((m) => String(m))
            .join(" ");

          if (!text) {
            return;
          }

          if (formFields.has(key)) {
            if (!fieldErrors[key]) {
              fieldErrors[key] = text;
            }
          } else {
            generalMessages.push(text);
          }
        });
      }

      if (Object.keys(fieldErrors).length > 0) {
        setValidationErrors(fieldErrors);
      }

      if (generalMessages.length > 0) {
        setFormError(generalMessages.join(" "));
      } else if (!Object.keys(fieldErrors).length) {
        setFormError(
          err instanceof Error ? err.message : "Failed to save billing plan",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
          {formError && (
            <div className="bg-destructive/10 text-destructive p-2 text-sm rounded-sm border border-destructive/20">
              {formError}
            </div>
          )}
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
              {validationErrors.rad_group_name && (
                <p className="text-xs text-destructive">
                  {validationErrors.rad_group_name}
                </p>
              )}
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
              {validationErrors.value && (
                <p className="text-xs text-destructive">
                  {validationErrors.value}
                </p>
              )}
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
              {validationErrors.valid_for && (
                <p className="text-xs text-destructive">
                  {validationErrors.valid_for}
                </p>
              )}
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
              {validationErrors.price && (
                <p className="text-xs text-destructive">
                  {validationErrors.price}
                </p>
              )}
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
              {validationErrors.display_name && (
                <p className="text-xs text-destructive">
                  {validationErrors.display_name}
                </p>
              )}
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
                <ul className="absolute z-10 w-full mt-1 bg-background border border-border rounded-sm shadow-lg max-h-60 overflow-auto text-sm">
                  {customerSuggestions.map((customer) => (
                    <li
                      key={customer.id}
                      className="px-3 py-2 hover:bg-muted cursor-pointer"
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
                      className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-sm text-xs"
                    >
                      {customer.account_no}
                      <button
                        type="button"
                        onClick={() => removeCustomer(customer.id)}
                        className="text-destructive hover:underline"
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
              onClick={() => handleDialogOpenChange(false)}
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
  );
}


