## ADDED Requirements

### Requirement: All landing page text uses i18n keys
All user-visible text in landing page components SHALL use `t('landing.*')` translation keys instead of hardcoded strings, supporting Chinese and English languages.

#### Scenario: Chinese language rendering
- **WHEN** the language is set to `zh`
- **THEN** all landing page text (navigation, hero, canvas showcase, features, CTA, footer) SHALL display in Chinese using values from `src/i18n/locales/zh.json` under the `landing.*` namespace

#### Scenario: English language rendering
- **WHEN** the language is set to `en`
- **THEN** all landing page text SHALL display in English using values from `src/i18n/locales/en.json` under the `landing.*` namespace

#### Scenario: No hardcoded text
- **WHEN** inspecting any landing page component source code
- **THEN** there SHALL be zero hardcoded Chinese or English user-visible strings; all text SHALL be referenced via `t()` function calls

### Requirement: Language switcher in navigation
The LandingNav component SHALL include a language switcher toggle that allows users to switch between Chinese and English.

#### Scenario: Switcher display
- **WHEN** the landing navigation bar is visible
- **THEN** a language toggle control SHALL be displayed, showing the current language option (e.g., "中文" / "EN")

#### Scenario: Switch to English
- **GIVEN** the current language is Chinese
- **WHEN** the user clicks the language toggle
- **THEN** all landing page text SHALL immediately update to English without a page reload

#### Scenario: Switch to Chinese
- **GIVEN** the current language is English
- **WHEN** the user clicks the language toggle
- **THEN** all landing page text SHALL immediately update to Chinese without a page reload

### Requirement: Language preference persistence
The selected language SHALL be persisted so returning visitors see their preferred language.

#### Scenario: Persistence via localStorage
- **WHEN** the user selects a language via the switcher
- **THEN** the choice SHALL be saved to `localStorage` using the existing `i18n-lang` key

#### Scenario: Restore on revisit
- **WHEN** a user revisits the landing page and a `i18n-lang` value exists in `localStorage`
- **THEN** the page SHALL load in the previously selected language

#### Scenario: Default language detection
- **WHEN** no `i18n-lang` value exists in `localStorage`
- **THEN** the page SHALL default to Chinese if `navigator.language` starts with `zh`, otherwise default to English

### Requirement: Translation key parity
The `landing.*` keys in `zh.json` and `en.json` SHALL be structurally identical.

#### Scenario: Key structure consistency
- **WHEN** comparing the `landing` key tree in `zh.json` and `en.json`
- **THEN** both files SHALL contain the exact same set of `landing.*` keys with no missing entries in either language

#### Scenario: No untranslated key display
- **WHEN** switching between languages on the landing page
- **THEN** no raw translation key (e.g., `landing.hero.headline`) SHALL be visible to the user; all keys SHALL resolve to translated text

### Requirement: Responsive text handling
Translated text SHALL render correctly across all viewport sizes in both languages.

#### Scenario: Chinese text does not overflow
- **WHEN** viewing the landing page in Chinese on a mobile viewport (<768px)
- **THEN** all text SHALL fit within its container without overflow, truncation, or overlapping

#### Scenario: English text does not overflow
- **WHEN** viewing the landing page in English on a mobile viewport (<768px)
- **THEN** all text SHALL fit within its container without overflow, truncation, or overlapping
