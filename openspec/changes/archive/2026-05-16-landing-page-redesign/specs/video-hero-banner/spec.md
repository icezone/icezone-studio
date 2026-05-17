## ADDED Requirements

### Requirement: Full-viewport video background
The landing page hero section SHALL display `public/banner.mp4` as a full-viewport (100vh) background video that autoplays, loops, and is muted by default.

#### Scenario: Video autoplay on page load
- **WHEN** a user visits the landing page at `/`
- **THEN** the hero section SHALL occupy 100% viewport height and display banner.mp4 playing automatically with no audio, using `object-fit: cover` to fill the viewport

#### Scenario: Video loop behavior
- **WHEN** banner.mp4 reaches its end
- **THEN** the video SHALL restart from the beginning seamlessly without user interaction

#### Scenario: Mobile autoplay compliance
- **WHEN** the page loads on a mobile browser that restricts autoplay
- **THEN** the video element SHALL include `muted`, `playsInline`, and `autoPlay` attributes and the `poster` attribute SHALL display a static fallback frame

### Requirement: Hero overlay with branding and CTAs
The video hero SHALL display an overlay containing the IceZone Studio logo, headline text, subtitle, and call-to-action buttons on top of the video background.

#### Scenario: Overlay content display
- **WHEN** the hero section is visible
- **THEN** the overlay SHALL show:
  - The IceZone Studio logo (`public/LOGO.jpg`) at a rendered size of approximately 48-64px
  - A headline text (e.g., "AI-Native Creative Canvas")
  - A subtitle description (1-2 sentences)
  - A primary CTA button linking to `/signup`
  - A secondary CTA button linking to the next section (scroll anchor)

#### Scenario: Overlay readability
- **WHEN** the video is playing behind the overlay
- **THEN** a semi-transparent gradient overlay (dark-to-transparent, top-to-bottom and bottom-to-top) SHALL ensure text maintains a minimum contrast ratio of 4.5:1 against the video background

### Requirement: Scroll indicator
The hero section SHALL display an animated scroll-down indicator near the bottom edge.

#### Scenario: Scroll indicator visibility
- **WHEN** the user has not scrolled and the hero section is fully visible
- **THEN** an animated downward arrow or chevron indicator SHALL be visible near the bottom of the viewport

#### Scenario: Scroll indicator hides on scroll
- **WHEN** the user scrolls down past 100px
- **THEN** the scroll indicator SHALL fade out

### Requirement: Responsive video sizing
The video hero SHALL adapt to all screen sizes without letterboxing or pillarboxing.

#### Scenario: Desktop viewport (≥1024px)
- **WHEN** the viewport width is ≥1024px
- **THEN** the video SHALL fill the entire viewport width and height using `object-fit: cover`

#### Scenario: Mobile viewport (<768px)
- **WHEN** the viewport width is <768px
- **THEN** the video SHALL still fill 100vh height, the headline text size SHALL scale down proportionally, and CTA buttons SHALL stack vertically
