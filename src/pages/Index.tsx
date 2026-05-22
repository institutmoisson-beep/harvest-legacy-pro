import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { MoissonneursStoriesSection } from "@/components/MoissonneursStoriesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { CommissionsSection } from "@/components/CommissionsSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <MoissonneursStoriesSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CommissionsSection />
      <Footer />
    </div>
  );
};

export default Index;

