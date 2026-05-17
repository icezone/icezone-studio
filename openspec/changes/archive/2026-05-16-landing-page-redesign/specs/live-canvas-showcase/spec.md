## ADDED Requirements

### Requirement: Canvas showcase section
The landing page SHALL include a "Live Canvas" showcase section below the video hero that demonstrates the IceZone Studio canvas workflow visually.

#### Scenario: Section visibility on scroll
- **WHEN** the user scrolls past the video hero section
- **THEN** the Live Canvas showcase section SHALL become visible with a scroll-reveal animation (fade-in + translate-up)

#### Scenario: Section content structure
- **WHEN** the Live Canvas section is rendered
- **THEN** it SHALL display:
  - A section heading (e.g., "See it in action")
  - A subtitle explaining the canvas concept
  - A visual canvas preview area showing a template layout

### Requirement: Canvas template preview
The showcase SHALL render a visual preview of a canvas template with animated node interactions to demonstrate the product workflow.

#### Scenario: Template layout display
- **WHEN** the canvas preview is rendered
- **THEN** it SHALL show multiple node cards arranged in a workflow pattern representing the "Novel-to-Storyboard" template (or designated official template), including:
  - Input node (e.g., novel/script input)
  - Processing nodes (e.g., AI generation)
  - Output nodes (e.g., storyboard frames)
  - Connection lines between nodes

#### Scenario: Animated node interactions
- **WHEN** the canvas preview is visible in the viewport
- **THEN** the nodes SHALL display subtle animations:
  - Connection lines with flowing dot animations
  - Nodes cycling through active states (highlighted borders)
  - Simulated progress indicators on AI processing nodes

#### Scenario: Canvas chrome elements
- **WHEN** the canvas preview is rendered
- **THEN** it SHALL include realistic canvas chrome:
  - A toolbar bar at the top with tool icons
  - A minimap in the bottom-right corner
  - A dot-grid background pattern

### Requirement: Responsive canvas preview
The canvas preview SHALL adapt to different viewport sizes while maintaining visual clarity.

#### Scenario: Desktop display (≥1024px)
- **WHEN** the viewport is ≥1024px
- **THEN** the canvas preview SHALL display at full width (max-width constrained) with all nodes and connections visible

#### Scenario: Mobile display (<768px)
- **WHEN** the viewport is <768px
- **THEN** the canvas preview SHALL scale down proportionally, maintaining aspect ratio, and MAY hide the minimap to save space

### Requirement: Glassmorphism card styling
The canvas preview container SHALL use a glassmorphism (frosted glass) design style consistent with the landing page aesthetic.

#### Scenario: Glass card appearance
- **WHEN** the canvas preview container is rendered
- **THEN** it SHALL apply:
  - A semi-transparent background (e.g., `rgba(255,255,255,0.04)`)
  - A subtle border (e.g., `rgba(255,255,255,0.08)`)
  - `backdrop-filter: blur()` for the frosted glass effect
  - Rounded corners (≥16px border-radius)
  - A subtle drop shadow
