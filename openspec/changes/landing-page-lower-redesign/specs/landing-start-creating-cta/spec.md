## ADDED Requirements

### Requirement: Section displays animated gradient background

The component SHALL display a background with animated gradient that shifts colors continuously.

#### Scenario: Gradient animates continuously
- **WHEN** the CTA section is visible
- **THEN** the background gradient animates with smooth color transitions

#### Scenario: Gradient animation respects reduced motion preference
- **WHEN** user has `prefers-reduced-motion: reduce` enabled
- **THEN** gradient displays as static without animation

### Requirement: Section shows floating image decorations from gallery

The component SHALL display floating images randomly selected from `/public/gallery/` positioned around the main CTA content with subtle float animation.

#### Scenario: Thumbnails float with subtle animation
- **WHEN** the CTA section is visible
- **THEN** gallery images float up and down with slow, continuous animation

#### Scenario: Gallery images are randomly sampled
- **WHEN** the component renders
- **THEN** 4-6 images are randomly selected from the available `/public/gallery/` assets each render

#### Scenario: Float animation respects reduced motion preference
- **WHEN** user has `prefers-reduced-motion: reduce` enabled
- **THEN** images display statically without float animation

### Requirement: Section displays headline, description, and CTA buttons

The component SHALL display a prominent headline, a description paragraph, a primary CTA button (signup), and a secondary CTA button (login).

#### Scenario: All content elements are visible
- **WHEN** the CTA section renders
- **THEN** headline, description, primary button, and secondary button are all visible and readable

#### Scenario: Primary button is visually emphasized
- **WHEN** the CTA section renders
- **THEN** the primary button (signup) has more visual emphasis than the secondary button (login)

### Requirement: CTA buttons navigate to respective routes

The component SHALL navigate to `/signup` when primary button is clicked and `/login` when secondary button is clicked.

#### Scenario: Primary button navigates to signup
- **WHEN** user clicks the primary CTA button
- **THEN** browser navigates to `/signup` route

#### Scenario: Secondary button navigates to login
- **WHEN** user clicks the secondary button
- **THEN** browser navigates to `/login` route

### Requirement: Section supports bilingual content

The component SHALL display headline, description, and button text in Chinese or English based on current language setting.

#### Scenario: Language switching updates all text
- **WHEN** user switches language from Chinese to English
- **THEN** headline, description, and button labels update to English without page reload

### Requirement: Section is responsive on mobile devices

The component SHALL adapt layout and button sizing for mobile viewports (<768px).

#### Scenario: Mobile stacks buttons vertically
- **WHEN** viewport width is less than 768px
- **THEN** CTA buttons stack vertically instead of horizontally

#### Scenario: Mobile scales headline text
- **WHEN** viewport width is less than 768px
- **THEN** headline text size reduces to fit mobile screen width

### Requirement: Section reveals on scroll with fade-in animation

The component SHALL animate into view when scrolled into viewport.

#### Scenario: Section animates on scroll reveal
- **WHEN** user scrolls and section enters viewport (20% visible)
- **THEN** section fades in with 600ms ease-out timing

#### Scenario: Animation respects reduced motion preference
- **WHEN** user has `prefers-reduced-motion: reduce` enabled
- **THEN** section appears immediately without fade-in animation
