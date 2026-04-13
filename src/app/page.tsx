import { LandingNav } from '@/components/landing/LandingNav';
import { VideoHero } from '@/components/landing/VideoHero';
import { LiveCanvasShowcase } from '@/components/landing/LiveCanvasShowcase';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { CallToAction } from '@/components/landing/CallToAction';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function HomePage() {
  return (
    <main>
      <LandingNav />
      <VideoHero />
      <LiveCanvasShowcase />
      <FeatureShowcase />
      <CallToAction />
      <LandingFooter />
    </main>
  );
}
