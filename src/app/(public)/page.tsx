import { redirect } from "next/navigation";
import CTASection from "@/components/home/CTASection";
import Hero from "@/components/home/Hero";
import { Lifecycle } from "@/components/home/Lifecycle";
import { Marquee } from "@/components/home/Marquee";
import { Reviews } from "@/components/home/Reviews";
import { Roles } from "@/components/home/Roles";
import { getCurrentUser } from "@/core/auth/current-user";
import { findUserValidFestival } from "@/features/festivals/repositories/festival.repository";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    if (user.globalRole === "SUPER_ADMIN") {
      redirect("/super-admin");
    }

    if (!user.fullName) {
      redirect("/onboarding");
    }

    const validFestival = await findUserValidFestival(user.id);
    if (validFestival) {
      redirect(`/dashboard/${validFestival.slug}`);
    }

    redirect("/profile");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Hero />
      <Marquee />
      <Lifecycle />
      <Roles />
      <Reviews />
      <CTASection />
    </div>
  );
}
