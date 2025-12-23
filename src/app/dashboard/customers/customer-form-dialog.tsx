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
import { SearchableSelect } from "@/components/ui/searchable-select";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomerId: string | null;
  onSaved: () => Promise<void> | void;
}

interface CustomerDetail {
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
}

interface BillingPlan {
  id: string;
  display_name: string;
  price: number | string;
}

type CustomerFormData = {
  username: string;
  email: string;
  phone_no: string;
  first_name: string;
  last_name: string;
  password: string;
  customer_type: string; // "1" | "2" | "3" | "4"
  pppoe_username: string;
  pppoe_password: string;
  ip_address: string;
  mac_address: string;
  default_plan: string;
};

const customerSchemaBase = z.object({
  username: z.string().min(1, "Username is required"),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  phone_no: z.string().optional().or(z.literal("")),
  first_name: z.string().optional().or(z.literal("")),
  last_name: z.string().optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  customer_type: z.enum(["1", "2", "3", "4"]),
  pppoe_username: z.string().optional().or(z.literal("")),
  pppoe_password: z.string().optional().or(z.literal("")),
  ip_address: z.string().optional().or(z.literal("")),
  mac_address: z.string().optional().or(z.literal("")),
  default_plan: z.string().optional().or(z.literal("")),
});

const customerSchema = customerSchemaBase.superRefine((data, ctx) => {
  if (data.customer_type === "2") {
    if (!data.pppoe_username) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pppoe_username"],
        message: "PPPoE username is required for PPPoE customers",
      });
    }
    if (!data.pppoe_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pppoe_password"],
        message: "PPPoE password is required for PPPoE customers",
      });
    }
  }

  if (data.customer_type === "3") {
    if (!data.ip_address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ip_address"],
        message: "IP address is required for static customers",
      });
    }
  }

  if (data.customer_type === "4") {
    if (!data.mac_address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mac_address"],
        message: "MAC address is required for home customers",
      });
    }
  }
});

/**
 * Generates a secure random password
 * @param length - Length of the password (default: 16)
 * @returns A random password string
 */
function generateRandomPassword(length: number = 16): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const allChars = uppercase + lowercase + numbers + special;

  // Use crypto.getRandomValues for secure randomness
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = array[i] % allChars.length;
    password += allChars[randomIndex];
  }

  // Ensure at least one character from each set
  const randomUpper = Math.floor(Math.random() * uppercase.length);
  const randomLower = Math.floor(Math.random() * lowercase.length);
  const randomNumber = Math.floor(Math.random() * numbers.length);
  const randomSpecial = Math.floor(Math.random() * special.length);

  password = password.slice(0, -4) + uppercase[randomUpper] + lowercase[randomLower] + numbers[randomNumber] + special[randomSpecial];

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  editingCustomerId,
  onSaved,
}: CustomerFormDialogProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
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
    default_plan: "",
  });
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [selectedBillingPlan, setSelectedBillingPlan] =
    useState<BillingPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

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
      default_plan: "",
    });
    setSelectedBillingPlan(null);
    setValidationErrors({});
    setFormError("");
  };

  useEffect(() => {
    const fetchBillingPlans = async () => {
      try {
        const response = await apiClient.get<
          { results: BillingPlan[] } | BillingPlan[]
        >("/api/v1/billing_plans/");
        const data = Array.isArray(response) ? response : response.results || [];
        setBillingPlans(data);
      } catch (err) {
        console.error("Failed to fetch billing plans", err);
      }
    };

    fetchBillingPlans();
  }, []);

  useEffect(() => {
    const loadCustomerForEdit = async (customerId: string) => {
      try {
        const customer = await apiClient.get<CustomerDetail>(
          `/api/v1/customers/${customerId}/`,
        );
        setFormData({
          username: customer.user_details?.username || "",
          email: customer.user_details?.email || "",
          phone_no: customer.user_details?.phone_no || "",
          first_name: customer.user_details?.first_name || "",
          last_name: customer.user_details?.last_name || "",
          password: "",
          customer_type: customer.customer_type.toString(),
          pppoe_username: customer.pppoe_username || "",
          pppoe_password: customer.pppoe_password || "",
          ip_address: customer.ip_address || "",
          mac_address: customer.mac_address || "",
          default_plan: customer.default_plan ? String(customer.default_plan) : "",
        });
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Failed to load customer",
        );
      }
    };

    if (open && editingCustomerId) {
      loadCustomerForEdit(editingCustomerId);
    }

    if (open && !editingCustomerId) {
      resetForm();
    }

    if (!open) {
      setValidationErrors({});
      setFormError("");
    }
  }, [open, editingCustomerId]);

  useEffect(() => {
    if (!open) return;
    if (!formData.default_plan) {
      setSelectedBillingPlan(null);
      return;
    }
    const plan = billingPlans.find((p) => p.id === formData.default_plan);
    setSelectedBillingPlan(plan || null);
  }, [open, billingPlans, formData.default_plan]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated: CustomerFormData = { ...prev, [name]: value };

      if (name === "customer_type") {
        if (value === "1") {
          updated.pppoe_username = "";
          updated.pppoe_password = "";
          updated.ip_address = "";
          updated.mac_address = "";
        } else if (value === "2") {
          updated.ip_address = "";
          updated.mac_address = "";
        } else if (value === "3") {
          updated.pppoe_username = "";
          updated.pppoe_password = "";
          updated.mac_address = "";
        } else if (value === "4") {
          updated.pppoe_username = "";
          updated.pppoe_password = "";
          updated.ip_address = "";
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setValidationErrors({});

    try {
      // Prepare payload
      let payload: CustomerFormData & { default_plan: string | null } = {
        ...formData,
        default_plan: selectedBillingPlan
          ? selectedBillingPlan.id
          : formData.default_plan || "",
      };

      // Auto-generate password when creating if not provided
      if (!editingCustomerId && (!payload.password || payload.password.trim() === "")) {
        payload.password = generateRandomPassword();
      }

      // When editing, set password to empty string if not provided (backend will keep current password)
      if (editingCustomerId && (!payload.password || payload.password.trim() === "")) {
        payload.password = "";
      }

      const parseResult = customerSchema.safeParse(payload);
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

      const finalPayload: any = {
        ...payload,
        default_plan: payload.default_plan || null,
      };

      if (editingCustomerId) {
        await apiClient.put(`/api/v1/customers/${editingCustomerId}/`, finalPayload);
      } else {
        await apiClient.post("/api/v1/customers/", finalPayload);
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
          "username",
          "email",
          "phone_no",
          "first_name",
          "last_name",
          "password",
          "customer_type",
          "pppoe_username",
          "pppoe_password",
          "ip_address",
          "mac_address",
          "default_plan",
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
          err instanceof Error ? err.message : "Failed to save customer",
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-destructive/10 text-destructive p-2 text-sm rounded-sm border border-destructive/20">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                disabled={saving}
              />
              {validationErrors.username && (
                <p className="text-xs text-destructive">
                  {validationErrors.username}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={saving}
              />
              {validationErrors.email && (
                <p className="text-xs text-destructive">
                  {validationErrors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_no">Phone Number</Label>
              <Input
                id="phone_no"
                name="phone_no"
                type="text"
                value={formData.phone_no}
                onChange={handleInputChange}
                disabled={saving}
                placeholder="712345234 (no country code)"
              />
              {validationErrors.phone_no && (
                <p className="text-xs text-destructive">
                  {validationErrors.phone_no}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password
                {editingCustomerId ? (
                  <span className="text-muted-foreground font-normal ml-1">
                    (optional - leave blank to keep current)
                  </span>
                ) : (
                  <span className="text-muted-foreground font-normal ml-1">
                    (optional - will be auto-generated if blank)
                  </span>
                )}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={saving}
                autoComplete="new-password"
              />
              {validationErrors.password && (
                <p className="text-xs text-destructive">
                  {validationErrors.password}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleInputChange}
                disabled={saving}
              />
              {validationErrors.first_name && (
                <p className="text-xs text-destructive">
                  {validationErrors.first_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleInputChange}
                disabled={saving}
              />
              {validationErrors.last_name && (
                <p className="text-xs text-destructive">
                  {validationErrors.last_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_type">Customer Type</Label>
              <select
                id="customer_type"
                name="customer_type"
                value={formData.customer_type}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
              >
                <option value="1">Hotspot</option>
                <option value="2">PPPoE</option>
                <option value="3">Static</option>
                <option value="4">Home</option>
              </select>
              {validationErrors.customer_type && (
                <p className="text-xs text-destructive">
                  {validationErrors.customer_type}
                </p>
              )}
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
                    disabled={saving}
                  />
                  {validationErrors.pppoe_username && (
                    <p className="text-xs text-destructive">
                      {validationErrors.pppoe_username}
                    </p>
                  )}
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
                    disabled={saving}
                  />
                  {validationErrors.pppoe_password && (
                    <p className="text-xs text-destructive">
                      {validationErrors.pppoe_password}
                    </p>
                  )}
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
                  disabled={saving}
                />
                {validationErrors.ip_address && (
                  <p className="text-xs text-destructive">
                    {validationErrors.ip_address}
                  </p>
                )}
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
                  disabled={saving}
                />
                {validationErrors.mac_address && (
                  <p className="text-xs text-destructive">
                    {validationErrors.mac_address}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2 col-span-2">
              <Label>Default Plan</Label>
              <SearchableSelect
                options={billingPlans}
                value={selectedBillingPlan}
                onValueChange={(plan) => {
                  setSelectedBillingPlan(plan);
                  setFormData((prev) => ({
                    ...prev,
                    default_plan: plan ? plan.id : "",
                  }));
                }}
                getLabel={(plan) => {
                  const price =
                    typeof plan.price === "string"
                      ? parseFloat(plan.price)
                      : plan.price;
                  return `${plan.display_name} - ${price.toFixed(2)}`;
                }}
                getValue={(plan) => plan.id}
                placeholder="Select default plan (optional)"
                searchPlaceholder="Search billing plans..."
                emptyMessage="No billing plans found"
                disabled={saving}
              />
              {validationErrors.default_plan && (
                <p className="text-xs text-destructive">
                  {validationErrors.default_plan}
                </p>
              )}
            </div>
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
  );
}


