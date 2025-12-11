"use client";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { AlertCircle } from "lucide-react";

export default function ForbiddenPage() {
  const handleLogout = () => {
    apiClient.logout();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-sm bg-destructive/10 p-4 border border-destructive/20">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">403</h1>
          <h2 className="text-lg font-semibold">Access Forbidden</h2>
          <p className="text-sm text-muted-foreground">
            You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Button onClick={handleLogout} variant="default">
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

