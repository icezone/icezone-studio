import { LandingNav } from '@/components/landing/LandingNav';
import { VideoHero } from '@/components/landing/VideoHero';
import { LiveCanvasShowcase } from '@/components/landing/LiveCanvasShowcase';
import { ModelMarquee } from '@/components/landing/ModelMarquee';
import { WhyIceZone } from '@/components/landing/WhyIceZone';
import { SceneShowcase } from '@/components/landing/SceneShowcase';
import { TemplateShowcase } from '@/components/landing/TemplateShowcase';
import { StartCreating } from '@/components/landing/StartCreating';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function HomePage() {
  return (
    <main>
      <LandingNav />
      <VideoHero />
      <ModelMarquee />
      <LiveCanvasShowcase />
      <WhyIceZone />
      <SceneShowcase />
      <TemplateShowcase />
      <StartCreating />
      <LandingFooter />
    </main>
  );
}
