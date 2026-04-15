## ADDED Requirements

### Requirement: Marquee displays AI model logos in continuous scroll

The component SHALL display a horizontal strip of AI model provider logos that scrolls continuously from right to left without user interaction.

#### Scenario: Marquee scrolls continuously
- **WHEN** the landing page loads
- **THEN** the marquee strip begins scrolling automatically from right to left

#### Scenario: Marquee creates seamless infinite loop
- **WHEN** the marquee reaches the end of the logo sequence
- **THEN** the sequence repeats seamlessly without visible gap or jump

### Requirement: Marquee applies frosted-glass visual styling

The component SHALL use a semi-transparent frosted-glass background effect with subtle blur to create visual separation from the background.

#### Scenario: Frosted-glass effect is visible
- **WHEN** the marquee is rendered over content
- **THEN** the background shows a frosted-glass effect with backdrop blur

### Requirement: Marquee supports bilingual model names

The component SHALL display model names in Chinese or English based on the current language setting.

#### Scenario: Language switching updates model names
- **WHEN** user switches language from Chinese to English
- **THEN** all model names update to English without page reload

### Requirement: Marquee is responsive on mobile devices

The component SHALL adjust logo size and scroll speed appropriately for mobile viewports (<768px).

#### Scenario: Mobile viewport shows smaller logos
- **WHEN** viewport width is less than 768px
- **THEN** logos scale down to fit mobile screen without horizontal overflow

### Requirement: Marquee respects reduced motion preferences

The component SHALL pause or disable scrolling animation when user has `prefers-reduced-motion` enabled.

#### Scenario: Reduced motion disables marquee scroll
- **WHEN** user has `prefers-reduced-motion: reduce` enabled
- **THEN** marquee logos display statically without scrolling animation
