"use client";

import { ChevronsUpDown, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  ALL_FESTIVAL_ROLES,
  PRIVILEGED_ROLES,
  ROLE_LABELS,
} from "@/features/role-switch/constants";
import {
  clearRoleSwitchAction,
  switchRoleAction,
} from "@/features/role-switch/actions/role-switch.actions";

const ROLE_ICONS: Record<string, string> = {
  SUPER_ADMIN: "SA",
  OWNER: "OW",
  ADMIN: "AD",
  ANNOUNCER: "AN",
  STAGE_MANAGER: "SM",
  MEDIA: "ME",
};

interface RoleSwitcherProps {
  festivalId: string;
  festivalSlug: string;
  festivalName: string;
  accentColor?: string;
  /** The user's actual role (SUPER_ADMIN, OWNER, ADMIN, etc.) */
  actualRole: string;
  /** The currently active/effective role for sidebar view */
  activeRole: string;
  /** Roles this member is assigned to (only for non-privileged) */
  memberRoles: string[];
  /** Whether the user is currently viewing as a different role */
  isSwitched: boolean;
}

export function RoleSwitcher({
  festivalId,
  festivalSlug,
  festivalName,
  accentColor,
  actualRole,
  activeRole,
  memberRoles,
  isSwitched,
}: RoleSwitcherProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();

  const isPrivileged = PRIVILEGED_ROLES.includes(actualRole as any);
  const switchableRoles = isPrivileged
    ? [...ALL_FESTIVAL_ROLES]
    : memberRoles;

  const showSwitcher = isPrivileged || memberRoles.length > 1;

  if (!showSwitcher) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="cursor-default focus:ring-0 focus-visible:ring-0 outline-none border-none">
            <div
              className="flex aspect-square size-8 items-center justify-center rounded-lg text-white font-bold text-xs"
              style={{ backgroundColor: accentColor || "#000" }}
            >
              {ROLE_ICONS[activeRole] || activeRole.slice(0, 2)}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold capitalize">
                {festivalName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[activeRole] || activeRole} View
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const handleSwitch = (targetRole: string) => {
    startTransition(async () => {
      await switchRoleAction(
        festivalId,
        festivalSlug,
        targetRole,
        actualRole,
        memberRoles,
      );
      router.push(`/dashboard/${festivalSlug}`);
      router.refresh();
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      await clearRoleSwitchAction(festivalId, festivalSlug);
      router.push(`/dashboard/${festivalSlug}`);
      router.refresh();
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Select
          value={activeRole}
          onValueChange={(val) => {
            if (val === "reset") {
              handleReset();
            } else {
              handleSwitch(val);
            }
          }}
        >
          <SelectPrimitive.Trigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground focus:ring-0 focus-visible:ring-0 outline-none border-none"
            >
              <div
                className="flex aspect-square size-8 items-center justify-center rounded-lg text-white font-bold text-xs"
                style={{ backgroundColor: accentColor || "#000" }}
              >
                {ROLE_ICONS[activeRole] || activeRole.slice(0, 2)}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold capitalize">
                  {festivalName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[activeRole] || activeRole} View
                  {isSwitched && " *"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-50" />
            </SidebarMenuButton>
          </SelectPrimitive.Trigger>

          <SelectContent
            className="min-w-56 rounded-lg"
            position="popper"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground">
                Switch Role View
              </SelectLabel>
              <SelectSeparator />

              {switchableRoles.map((role) => (
                <SelectItem
                  key={role}
                  value={role}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-sm border bg-muted text-[10px] font-bold">
                      {ROLE_ICONS[role] || role.slice(0, 2)}
                    </div>
                    <span>{ROLE_LABELS[role] || role}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>

            {isSwitched && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectItem
                    value="reset"
                    disabled={isPending}
                    className="cursor-pointer text-muted-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <RotateCcw className="size-4" />
                      <span>Reset to {ROLE_LABELS[actualRole] || actualRole}</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
