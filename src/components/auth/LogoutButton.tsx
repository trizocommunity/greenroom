"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/core/http/csrf-fetch";

interface LogoutButtonProps {
  /** Custom trigger element. If not provided, uses default Button */
  children?: React.ReactNode;
  /** Variant for the default button trigger */
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "link";
  /** Size for the default button trigger */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional className for the trigger */
  className?: string;
  /** Show icon in default trigger */
  showIcon?: boolean;
  /** Show text in default trigger */
  showText?: boolean;
}

export function LogoutButton({
  children,
  variant = "outline",
  size = "sm",
  className,
  showIcon = true,
  showText = true,
}: LogoutButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate: logout, isPending } = useMutation({
    mutationFn: async () => {
      const response = await csrfFetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to logout");
      }
    },
    onSuccess: () => {
      // Clear all React Query cache to prevent stale data on user switch
      queryClient.clear();
      router.push("/");
      router.refresh();
      toast.success("Logged out successfully");
    },
    onError: () => {
      toast.error("Failed to log out");
    },
  });

  const defaultTrigger = (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : showIcon ? (
        <LogOut size={16} />
      ) : null}
      {showText && <span className={showIcon ? "ml-2" : ""}>Log Out</span>}
    </Button>
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out of your account and redirected to the home
            page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => logout()}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Logging out...
              </>
            ) : (
              "Log Out"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
