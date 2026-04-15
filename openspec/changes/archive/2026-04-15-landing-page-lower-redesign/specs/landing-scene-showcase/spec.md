## ADDED Requirements

### Requirement: Section displays horizontal tab row for scene types

The component SHALL display a horizontal row of tabs representing different creative scene types (e.g., "Ads", "Novels", "Concepts").

#### Scenario: Tab row shows all scene types
- **WHEN** the scene showcase section loads
- **THEN** all scene type tabs are visible in a horizontal row

#### Scenario: User can select a tab
- **WHEN** user clicks on a scene type tab
- **THEN** the tab becomes active (highlighted) and other tabs become inactive

### Requirement: Section displays full-viewport video player for selected scene

The component SHALL display a video player that shows the video corresponding to the currently selected tab.

#### Scenario: Video changes when tab is selected
- **WHEN** user selects a different scene type tab
- **THEN** the video player updates to show the video for that scene type

#### Scenario: Video player controls are available
- **WHEN** video is displayed
- **THEN** user can play, pause, and seek using browser default video controls

### Requirement: Active tab is visually distinguished

The component SHALL visually distinguish the active tab from inactive tabs using color, border, or background styling.

#### Scenario: Active tab has distinct styling
- **WHEN** a tab is active
- **THEN** it displays with a different background color or border than inactive tabs

### Requirement: Section supports bilingual tab labels

The component SHALL display tab labels and video descriptions in Chinese or English based on current language setting.

#### Scenario: Language switching updates tab labels
- **WHEN** user switches language from Chinese to English
- **THEN** all tab labels update to English without page reload

### Requirement: Section is responsive on mobile devices

The component SHALL adapt tab layout and video player sizing for mobile viewports (<768px).

#### Scenario: Mobile shows scrollable tab row
- **WHEN** viewport width is less than 768px
- **THEN** tab row becomes horizontally scrollable if tabs overflow

#### Scenario: Mobile shows full-width video player
- **WHEN** viewport width is less than 768px
- **THEN** video player scales to full viewport width

### Requirement: Section reveals on scroll with fade-in animation

The component SHALL animate into view when scrolled into viewport.

#### Scenario: Section animates on scroll reveal
- **WHEN** user scrolls and section enters viewport (20% visible)
- **THEN** section fades in with 600ms ease-out timing

#### Scenario: Animation respects reduced motion preference
- **WHEN** user has `prefers-reduced-motion: reduce` enabled
- **THEN** section appears immediately without animation
