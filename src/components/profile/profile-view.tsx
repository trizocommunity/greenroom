'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { User } from "@prisma/client"
import { updateProfile } from "@/server/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FestivalsTab } from "./FestivalsTab"
import { BillingTab } from "./BillingTab"

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  age: z.coerce.number().min(13, "You must be at least 13 years old").max(120, "Invalid age"),
})

interface UserWithProfile extends User {
  fullName: string | null
  displayName: string | null
  age: number | null
}

interface ProfileViewProps {
  user: UserWithProfile
}

export function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("festivals")

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      fullName: user.fullName || "",
      displayName: user.displayName || "",
      age: (user.age || "") as any,
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Profile updated successfully")
        router.refresh()
      }
    },
    onError: () => {
      toast.error("Something went wrong.")
    }
  })

  function onSubmit(values: z.infer<typeof profileSchema>) {
    mutate(values)
  }

  const initials = user.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
    : user.email.substring(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
            <AvatarImage src="" />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div>
            <h1 className="text-2xl font-bold">{user.displayName || user.fullName || "User"}</h1>
            <p className="text-muted-foreground">{user.email}</p>
        </div>
       </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent w-full justify-start border-b rounded-none h-auto p-0 gap-6">
          <TabsTrigger 
            value="festivals"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 shadow-none"
          >
            Festivals
          </TabsTrigger>
          <TabsTrigger 
            value="profile"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 shadow-none"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="billing"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 shadow-none"
          >
            Billing
          </TabsTrigger>
          <TabsTrigger 
            value="settings"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 shadow-none"
          >
            Settings
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
            <TabsContent value="profile" className="m-0">
            <Card>
                <CardHeader>
                <CardTitle>Details</CardTitle>
                <CardDescription>Read-only view of your profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
                        <p className="font-medium mt-1">{user.fullName || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Display Name</Label>
                        <p className="font-medium mt-1">{user.displayName || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Age</Label>
                        <p className="font-medium mt-1">{user.age || "-"}</p>
                    </div>
                     <div className="p-4 rounded-lg bg-muted/50 border">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role</Label>
                        <p className="font-medium mt-1">{user.globalRole}</p>
                    </div>
                </div>
                </CardContent>
            </Card>
            </TabsContent>
            
            <TabsContent value="festivals" className="m-0">
              <FestivalsTab user={user} />
            </TabsContent>

            <TabsContent value="billing" className="m-0">
              <BillingTab />
            </TabsContent>

            <TabsContent value="settings" className="m-0">
            <Card>
                <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                    <FormField
                        control={form.control as any}
                        name="fullName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control as any}
                        name="displayName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                            <Input placeholder="janedoe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control as any}
                        name="age"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="25" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={!form.formState.isValid || isPending}>
                        {isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
