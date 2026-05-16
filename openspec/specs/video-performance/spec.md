## ADDED Requirements

### Requirement: VideoHero banner uses metadata preload
The VideoHero `<video>` element SHALL have `preload="metadata"` so the browser fetches only the first frame and duration metadata on page load, without buffering the full video.

#### Scenario: Banner video shows first frame quickly
- **WHEN** the landing page loads
- **THEN** the banner video SHALL display its poster/first frame without waiting for the full video to buffer

### Requirement: SceneShowcase inactive videos are lazily loaded
The SceneShowcase component SHALL only assign `src` to the active slide's video element. Inactive slide video elements SHALL have no `src` until their slide becomes active for the first time.

#### Scenario: Initial page load only fetches active video
- **WHEN** the landing page loads with SceneShowcase active index 0
- **THEN** only the first scene video SHALL have a `src` attribute assigned
- **THEN** the remaining 4 scene video elements SHALL have no `src`

#### Scenario: Tab click triggers lazy src assignment
- **WHEN** a user clicks a scene tab (e.g., tab index 2)
- **THEN** the corresponding video element SHALL have its `src` assigned immediately
- **THEN** the video SHALL begin playing

### Requirement: Marquee animation uses GPU compositing
The ModelMarquee scrolling animation SHALL use `translate3d` in its CSS keyframes to force GPU layer compositing, preventing main-thread layout recalculations during animation.

#### Scenario: Marquee runs without main-thread jank
- **WHEN** the landing page is scrolled while the marquee is animating
- **THEN** the marquee SHALL continue animating smoothly without visible stutter

### Requirement: Below-the-fold images use lazy loading
All `<Image>` components in TemplateShowcase, StartCreating, and WhyIceZone SHALL have `loading="lazy"` to defer network requests until the user scrolls near them.

#### Scenario: Gallery images do not block initial paint
- **WHEN** the landing page first loads
- **THEN** images below the fold SHALL NOT be fetched until the user scrolls within one viewport of them
