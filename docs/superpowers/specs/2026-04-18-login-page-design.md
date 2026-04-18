# Login Page Design

## Goal

Create a standalone login page that matches the visual language of `design/prototype.html` while narrowing the experience to a simple username-and-password flow.

## Source Style Signals

- Typography: `Quicksand` with `Noto Sans SC`
- Background: light neutral canvas with dotted pattern
- Primary accent: warm yellow
- Primary stroke/text: deep slate outline
- Components: thick borders, rounded corners, soft shadows, playful press-down interactions

## Layout

Use a two-column composition.

- Left column: brand/story area with decorative geometric shapes, compact product copy, and a small status panel that echoes the prototype's playful dashboard feel
- Right column: a centered login card with only the essential inputs and actions

On smaller screens, collapse to a single-column layout with the brand panel above the form.

## UI Content

The page should include:

- Product mark / title
- Short supporting brand statement
- Username field
- Password field
- Password visibility toggle
- Primary login button
- Inline validation for empty fields
- Lightweight loading state
- Success feedback message after simulated submit

The page should not include:

- Registration flow
- Third-party login
- QR code login
- Backend integration

## Interaction Notes

- Inputs should have strong focus styling that fits the outlined visual system
- The primary button should preserve the prototype's tactile pressed state
- Validation should stay small and clear, not modal or disruptive
- The success state can be simulated entirely on the front end

## Technical Notes

- Deliver as a single HTML file with embedded CSS and JS
- No external build step required
- Keep implementation self-contained and easy to open locally

## Review Notes

- Scope is intentionally limited to a front-end prototype page
- No git repository was available in the current workspace, so this spec could not be committed
