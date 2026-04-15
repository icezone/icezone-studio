## ADDED Requirements

### Requirement: Section displays template cards in scattered layout

The component SHALL display template cards using absolute positioning to create a scattered, organic layout across the section.

#### Scenario: Cards are positioned at different locations
- **WHEN** the template showcase section renders
- **THEN** template cards appear at different vertical and horizontal positions creating a scattered effect

#### Scenario: Cards do not overlap on desktop
- **WHEN** viewport width is 1024px or wider
- **THEN** no template cards overlap each other

### Requirement: Each template card shows thumbnail, title, and category

Each template card SHALL display a thumbnail image, a title, and a category label.

#### Scenario: Card displays all content elements
- **WHEN** a template card is rendered
- **THEN** the card shows a thumbnail image, a title overlay, and a category badge

### Requirement: Template cards have hover animation effect

Template cards SHALL animate on hover with scale transformation and shadow elevation.

#### Scenario: Card scales up on hover
- **WHEN** user hovers over a template card
- **THEN** the card scales up slightly (1.05x) with smooth transition

#### Scenario: Card shows shadow elevation on hover
- **WHEN** user hovers over a template card
- **THEN** the card displays an elevated shadow effect

### Requirement: Section uses responsive grid layout on mobile

The component SHALL switch from absolute positioning to CSS grid layout on mobile viewports (<768px).

#### Scenario: Mobile shows grid layout
- **WHEN** viewport width is less than 768px
- **THEN** template cards display in a responsive grid layout instead of absolute positioning

#### Scenario: Mobile cards are positioned relatively
- **WHEN** viewport width is less than 768px
- **THEN** all cards use `position: relative` instead of `position: absolute`

### Requirement: Section supports bilingual template titles

The component SHALL display template titles and category labels in Chinese or English based on current language setting.

#### Scenario: Language switching updates template content
- **WHEN** user switches language from Chinese to English
- **THEN** all template titles and category labels update to English without page reload

### Requirement: Section reveals on scroll with staggered animation

The component SHALL animate cards into view with staggered timing when section enters viewport.

#### Scenario: Cards animate with staggered timing
- **WHEN** section scrolls into viewport (20% visible)
- **THEN** cards fade in sequentially with 100ms delay between each card

#### Scenario: Animation respects reduced motion preference
- **WHEN** user has `prefers-reduced-motion: reduce` enabled
- **THEN** all cards appear immediately without staggered animation

### Requirement: Clicking template card opens template browser modal

The component SHALL open a full-screen modal panel when user clicks on any template card, displaying all available official and public templates.

#### Scenario: Card click opens modal
- **WHEN** user clicks on any template card
- **THEN** a full-screen modal overlay appears displaying the template browser

#### Scenario: Modal displays official and public templates
- **WHEN** the template browser modal is open
- **THEN** all official templates and public templates are displayed in a browsable grid layout

### Requirement: Template browser modal supports navigation and filtering

The modal SHALL allow users to browse templates with category filtering and search capabilities.

#### Scenario: User can browse templates in modal
- **WHEN** the modal is open
- **THEN** user can scroll through all available templates

#### Scenario: User can filter templates by category
- **WHEN** user selects a category filter in the modal
- **THEN** only templates matching that category are displayed

### Requirement: Template selection leads to login page

The modal SHALL provide template selection that redirects non-authenticated users to the login page.

#### Scenario: Clicking template leads to login for unauthenticated users
- **WHEN** user clicks on a template in the modal and is not logged in
- **THEN** browser navigates to `/login` route with template context preserved

#### Scenario: Template context is preserved in navigation
- **WHEN** user is redirected to login from template selection
- **THEN** selected template ID is passed as URL parameter or state for post-login redirect

### Requirement: Modal can be closed by user

The modal SHALL provide close functionality via close button or overlay click.

#### Scenario: Close button closes modal
- **WHEN** user clicks the close button in modal header
- **THEN** modal dismisses and returns to landing page view

#### Scenario: Overlay click closes modal
- **WHEN** user clicks outside the modal content area on the overlay
- **THEN** modal dismisses and returns to landing page view

#### Scenario: Escape key closes modal
- **WHEN** user presses Escape key while modal is open
- **THEN** modal dismisses and returns to landing page view

### Requirement: Modal supports bilingual content

The modal SHALL display template names, categories, and UI text in Chinese or English based on current language setting.

#### Scenario: Language switching updates modal content
- **WHEN** user switches language while modal is open
- **THEN** all modal text content updates to the selected language without closing the modal
