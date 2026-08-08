 UI / DESIGN SYSTEM RULES

## Tech Stack

Build the frontend using:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide Icons

Use shadcn/ui as the base component system.
Prefer existing shadcn/ui components instead of creating custom primitives.

The application must be modular and extensible.
Components should be reusable and domain-independent where possible.

---

# Design Direction

The visual language should be:

- Minimal
- Premium
- Calm
- Professional
- Modern
- Neutral
- Information-dense but not visually heavy

Reference the visual language of modern products such as:

- Linear
- Vercel
- Notion
- Raycast
- Stripe
- Apple

Do NOT copy their branding or layouts.
Use them only as general visual references.

The UI should feel like a high-quality SaaS product rather than an admin template.

---

# Color System

Use a neutral grayscale-first palette.

Primary colors:

- White / near-white backgrounds
- Black / near-black text
- Neutral gray borders
- Neutral gray secondary text
- Very subtle gray surfaces

Avoid strong colors by default.

Do NOT use:

- Bright blue everywhere
- Purple gradients
- Neon colors
- Excessive green/red/yellow
- Glassmorphism
- Heavy gradients
- Strong shadows

Color should communicate meaning, not decoration.

Semantic colors such as success, warning and destructive should be used only when necessary.

Prefer subtle semantic colors with low saturation.

Example hierarchy:

Background:
#FFFFFF / #FAFAFA

Primary text:
#111111

Secondary text:
#737373

Muted text:
#A3A3A3

Borders:
#E5E5E5

Subtle surface:
#F5F5F5

The exact colors may be implemented through Tailwind/shadcn design tokens rather than hardcoded throughout components.

---

# Background

Use a clean white or slightly warm/cool off-white background.

Avoid pure visual emptiness by using very subtle surface differentiation.

Example:

Page background:
neutral-50

Cards:
white

Muted sections:
neutral-50 / neutral-100

Borders:
neutral-200

The difference between surfaces should be subtle.

---

# Typography

Typography is one of the main design elements.

Use a modern sans-serif font.

Prefer:

- Inter
- Geist
- system-ui

Typography should have strong hierarchy but remain restrained.

Headings:

- semibold/bold
- tight letter spacing
- dark
- relatively compact

Body:

- regular
- neutral gray
- comfortable line-height

Secondary information:

- smaller
- muted gray

Avoid excessive font sizes.

Do not make every heading visually dominant.

---

# Layout

Use a spacious but compact SaaS dashboard layout.

Desktop layout:

- fixed left sidebar
- top navigation/header
- main content area
- centered content with reasonable max-width

Typical structure:

Sidebar
    ↓
Topbar
    ↓
Page header
    ↓
Content sections

Use consistent spacing.

Preferred spacing scale:

4
8
12
16
20
24
32
40
48

Avoid arbitrary spacing values.

---

# Sidebar

Sidebar should be minimal and quiet.

It should NOT visually dominate the application.

Use:

- white / near-white background
- very subtle border
- compact navigation items
- small Lucide icons
- muted labels
- subtle hover state
- subtle active state

Active navigation item:

- slightly darker text
- very light gray background
- rounded-md / rounded-lg
- no bright accent color

Example:

Dashboard
Tasks
Goals
Habits
Activity
Points
Analytics

Use clear visual grouping.

Example:

MAIN
Dashboard
Goals
Tasks
Habits

INSIGHTS
Activity
Analytics

SYSTEM
Settings

---

# Header

Top navigation should be extremely clean.

Use:

- subtle bottom border
- search
- navigation/actions
- user menu
- theme switcher when appropriate

Avoid large colorful headers.

Search should resemble a command/search control rather than a traditional form.

Example:

[⌕ Search...        ⌘ K]

---

# Cards

Cards should be subtle.

Preferred:

- white background
- 1px neutral border
- very small shadow or no shadow
- rounded-xl
- generous internal spacing

Avoid:

- heavy shadows
- thick borders
- gradients
- excessive rounded corners
- colorful backgrounds

Cards should visually blend into the application.

Use cards to group information, not decorate the page.

---

# Border Radius

Use consistent radius.

Preferred:

- buttons: rounded-md
- inputs: rounded-md
- cards: rounded-xl
- large containers: rounded-xl / rounded-2xl
- badges: rounded-full

Do not use extremely rounded "bubble" UI.

---

# Shadows

Use shadows extremely sparingly.

Default:

shadow-none

For elevated elements:

shadow-sm

Only use stronger shadows for:

- dialogs
- popovers
- dropdowns
- floating elements

The interface should rely primarily on spacing, borders and surface contrast rather than shadows.

---

# Buttons

Buttons should be compact and restrained.

Primary button:

- dark background
- white text
- subtle hover
- rounded-md

Secondary button:

- white/neutral background
- neutral border
- dark text

Ghost button:

- transparent
- subtle hover background

Avoid giant CTA buttons inside the application.

Buttons should generally not exceed their required size.

---

# Icons

Use Lucide Icons.

Icons should be:

- simple
- thin
- consistent
- monochrome

Do not mix icon libraries.

Do not use emojis as UI icons.

Icons should support hierarchy rather than attract attention.

---

# Tables

Tables should feel like modern productivity software.

Use:

- subtle horizontal separators
- compact headers
- muted column labels
- generous row height
- subtle hover state
- small status badges

Avoid:

- heavy grid borders
- colored table headers
- excessive background colors

Example:

Name          Status       Progress       Updated
────────────────────────────────────────────────
Goal A        Active       72%            Today
Goal B        Paused       41%            Yesterday

---

# Status Badges

Badges should be subtle.

Example:

Active:
light neutral/semantic background + dark semantic text

Completed:
very light green + muted green text

Paused:
very light gray + gray text

Do not use saturated badge backgrounds.

---

# Progress

Progress indicators should be visually minimal.

Use:

- thin progress bars
- subtle background track
- restrained accent color

Avoid giant circular progress indicators unless they are genuinely useful.

Progress should communicate information, not become decoration.

---

# Charts

Charts should be extremely clean.

Use grayscale or very restrained accent colors.

Avoid:

- colorful dashboards
- 5+ chart colors
- gradients
- 3D charts
- decorative chart backgrounds

Chart style:

- thin lines
- subtle grid
- muted axis labels
- minimal legends
- no unnecessary borders

Charts should resemble analytical/productivity software.

---

# Dashboard

Dashboard hierarchy should be:

1. Page title
2. Short contextual description
3. Important metrics
4. Main visualization
5. Detailed information
6. Secondary information

Do not put everything into cards.

Use whitespace to establish hierarchy.

Example:

Dashboard

Good morning.
Here's your progress toward your current objectives.

[ Progress ] [ XP ] [ GPP ] [ Activity ]

[                    Main Progress Chart                    ]

[ Goals                              ] [ Activity            ]
[ Goal 1                             ] [ Task completed      ]
[ Goal 2                             ] [ Goal reviewed       ]
[ Goal 3                             ] [ Check-in            ]

---

# Goal UI

Goals are one of the most important domain objects.

A goal should visually communicate:

- title
- description
- progress
- current status
- deadline
- activity
- related tasks
- accumulated points

Do not overload the goal card.

Prefer progressive disclosure.

Summary first.
Details on interaction.

---

# Points / XP / GPP

Points should feel like a financial/analytics system rather than a game.

Avoid childish gamification.

Use:

- numeric typography
- subtle trend indicators
- transaction history
- charts
- clean badges

Example:

GPP Balance
12,450

+320 this week

XP
4,820

+8.4%

The interface should feel closer to a premium financial dashboard than a game HUD.

---

# Activity Feed

Activity should look like a timeline/audit log.

Example:

Task completed
"Read Spacecraft Systems Engineering"
+100 GPP
+15 XP
2h ago

Goal reviewed
"Build spacecraft software"
3h ago

Use subtle separators and typography.

Do not make every event a large card.

---

# Empty States

Empty states should be minimal.

Use:

- short explanation
- one primary action
- optional subtle icon

Avoid huge illustrations unless they add actual value.

Example:

No goals yet

Create your first goal to start tracking progress.

[Create goal]

---

# Modals / Dialogs

Dialogs should be clean and compact.

Use shadcn Dialog.

Preferred:

- white background
- rounded-xl
- subtle border
- shadow-sm / shadow-md
- clear title
- concise description
- obvious actions

Avoid oversized modal windows.

---

# Forms

Forms should be simple and spacious.

Use:

Label
Input
Description
Validation

Avoid putting too many inputs into one row.

Use progressive disclosure for advanced options.

---

# Animation

Animations should be subtle and fast.

Use animation only to communicate state changes.

Preferred:

- 100–200ms transitions
- opacity
- small translate
- subtle scale

Avoid:

- bouncing
- excessive motion
- large transitions
- decorative animations

Respect prefers-reduced-motion.

---

# Responsive Design

Desktop-first is acceptable, but the UI must remain responsive.

Breakpoints should be handled through Tailwind.

Sidebar should collapse on smaller screens.

Tables should become scrollable or transform into appropriate mobile layouts.

Do not simply shrink desktop UI.

---

# Accessibility

All components must be accessible.

Use:

- semantic HTML
- keyboard navigation
- visible focus states
- aria labels where necessary
- sufficient contrast
- reduced motion support

Do not sacrifice accessibility for visual minimalism.

---

# Component Architecture

Keep the component hierarchy clean.

Use:

components/
    ui/
        button
        card
        dialog
        input
        badge
        progress
        tabs

    goals/
        goal-card
        goal-progress
        goal-list
        goal-header

    tasks/
        task-card
        task-list
        task-status

    points/
        points-balance
        transaction-list
        points-chart

    activity/
        activity-feed
        activity-item

    dashboard/
        metric-card
        progress-overview
        activity-summary

Do not put domain logic inside generic UI components.

Generic components must remain reusable.

---

# Design Tokens

Do not hardcode colors throughout the application.

Use shadcn/Tailwind semantic tokens:

--background
--foreground
--card
--card-foreground
--popover
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--destructive
--border
--input
--ring

The entire visual identity must be changeable by modifying the design tokens.

---

# General Rule

When deciding between two UI solutions:

Prefer the solution that is:

1. Simpler
2. Quieter
3. More consistent
4. More reusable
5. More information-dense
6. Less decorative

The UI should feel expensive because of:

- typography
- spacing
- alignment
- consistency
- restraint
- hierarchy

NOT because of:

- gradients
- animations
- bright colors
- shadows
- excessive rounded corners
- visual effects

The final result should feel like a premium productivity/analytics application built by a mature product team.

VISUAL REFERENCE

Use the provided screenshot as the primary visual reference for density, spacing,
border treatment, grayscale palette, sidebar structure, card proportions,
typography hierarchy and overall visual restraint.

Do not copy the exact layout or content.

The target visual feeling is:
"premium neutral SaaS dashboard".

Prefer grayscale UI with very subtle contrast between:
background → surfaces → cards → borders.

The interface should be predominantly white/gray/black.
Accent colors should occupy a very small percentage of the screen.