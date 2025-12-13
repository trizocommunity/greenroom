import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Greenroom",
  description: "View your profile information",
};

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
  });

  if (!user) {
      // Session valid but user not found (rare consistency issue)
      redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Profile</CardTitle>
          <CardDescription>
            Manage your account and view your details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Information</Label>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50 border">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                    <p className="font-medium mt-1">{user.email}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role</Label>
                    <p className="font-medium mt-1">{user.globalRole}</p>
                </div>
                 <div className="p-4 rounded-lg bg-muted/50 border">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">User ID</Label>
                    <p className="font-mono text-sm mt-1 text-muted-foreground truncate" title={user.id}>{user.id}</p>
                </div>
                 <div className="p-4 rounded-lg bg-muted/50 border">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Account Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <p className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
