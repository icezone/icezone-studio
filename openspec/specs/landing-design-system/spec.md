## ADDED Requirements

### Requirement: IceZone Studio branding
All landing page components SHALL use "IceZone Studio" branding instead of "StoryboardCopilot".

#### Scenario: Logo display in navigation
- **WHEN** the landing page navigation is rendered
- **THEN** it SHALL display the `public/LOGO.jpg` image (rendered at ~32px height) alongside the text "IceZone Studio"

#### Scenario: Logo display in footer
- **WHEN** the landing page footer is rendered
- **THEN** it SHALL display the `public/LOGO.jpg` image alongside "IceZone Studio" text and a brief product description

#### Scenario: No StoryboardCopilot references
- **WHEN** any landing page component is rendered
- **THEN** the text "StoryboardCopilot" SHALL NOT appear anywhere on the page

### Requirement: Navigation bar with scroll behavior
The landing page navigation SHALL be fixed at the top and transition from transparent to solid background on scroll.

#### Scenario: Initial transparent state
- **WHEN** the page is at scroll position 0
- **THEN** the navigation background SHALL be fully transparent with no border

#### Scenario: Scrolled solid state
- **WHEN** the user scrolls past 48px
- **THEN** the navigation background SHALL transition to a semi-transparent dark background with backdrop blur and a subtle bottom border

#### Scenario: Navigation links
- **WHEN** the navigation is rendered
- **THEN** it SHALL contain anchor links for page sections and action buttons (Sign in, Start free CTA)

#### Scenario: Mobile responsive navigation
- **WHEN** the viewport is <768px
- **THEN** navigation links SHALL collapse into a hamburger menu that expands on tap

### Requirement: Minimalist design language
The landing page SHALL follow a minimalist, high-contrast dark design aesthetic inspired by modern AI product pages.

#### Scenario: Color palette usage
- **WHEN** any landing section is rendered
- **THEN** it SHALL use the landing palette tokens from `globals.css` (`--color-ink`, `--color-surface`, `--color-amber`, etc.) with a predominantly dark background and selective accent colors

#### Scenario: Typography hierarchy
- **WHEN** section headings are rendered
- **THEN** they SHALL use the display font (`var(--font-display)`) with font-weight ≥700, and body text SHALL use the sans font with appropriate color contrast (`--color-muted` for secondary text, white for primary)

#### Scenario: Generous whitespace
- **WHEN** sections are laid out
- **THEN** each section SHALL have vertical padding of ≥80px (≥5rem) on desktop and ≥48px (≥3rem) on mobile, with max-width constraints for content readability

### Requirement: Scroll-triggered reveal animations
Landing page sections SHALL animate into view as the user scrolls.

#### Scenario: Section reveal on scroll
- **WHEN** a section enters the viewport (via IntersectionObserver with threshold ~0.1)
- **THEN** it SHALL transition from invisible (opacity: 0, translateY: 20-30px) to visible (opacity: 1, translateY: 0) over 500-700ms with an ease-out timing function

#### Scenario: Staggered child reveals
- **WHEN** a section with multiple child elements (e.g., feature cards) enters the viewport
- **THEN** child elements SHALL reveal sequentially with 80-120ms stagger delay between each

#### Scenario: One-time animation
- **WHEN** a section has already been revealed
- **THEN** the reveal animation SHALL NOT replay if the section leaves and re-enters the viewport

### Requirement: Feature showcase section
The landing page SHALL include a feature showcase section highlighting 3-4 key capabilities.

#### Scenario: Feature card display
- **WHEN** the feature showcase section is rendered
- **THEN** it SHALL display 3-4 feature cards in a responsive grid, each containing:
  - An icon or visual indicator
  - A feature title
  - A brief description (1-2 sentences)
  - Optional: tags or badges for supported models/tools

#### Scenario: Feature card hover interaction
- **WHEN** a user hovers over a feature card on desktop
- **THEN** the card border SHALL brighten subtly and the card MAY slightly elevate (subtle scale or shadow change)

### Requirement: Call-to-action section
The landing page SHALL include a final CTA section before the footer.

#### Scenario: CTA section content
- **WHEN** the CTA section is rendered
- **THEN** it SHALL display:
  - A compelling headline
  - A brief description
  - A primary action button (link to `/signup`)
  - A secondary action button (link to `/login`)

#### Scenario: CTA visual emphasis
- **WHEN** the CTA section is rendered
- **THEN** it SHALL have a visually distinct background (e.g., gradient or bordered card) that differentiates it from adjacent sections

### Requirement: Redesigned footer
The landing page SHALL include a footer with updated branding and organized link groups.

#### Scenario: Footer structure
- **WHEN** the footer is rendered
- **THEN** it SHALL contain:
  - IceZone Studio logo and product description
  - Link groups (Product, Company, Legal) with relevant links
  - Copyright notice with current year
  - Social media links (Twitter, GitHub, Discord)

#### Scenario: Footer responsive layout
- **WHEN** the viewport is <768px
- **THEN** the footer link groups SHALL stack vertically in a single column layout
