import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MarketplacePreview from "@/components/MarketplacePreview";
import SwipePreview from "@/components/SwipePreview";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import OnboardingModal from "@/components/OnboardingModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data && !data.onboarding_completed) {
          setShowOnboarding(true);
        }
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <MarketplacePreview />
      <SwipePreview />
      <HowItWorks />
      <Footer />
      <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />
    </div>
  );
};

export default Index;