# Sri Pickles

A static, client-side e‑commerce website for Sri Pickles (Nirmal, Telangana). It showcases traditional Indian pickles, supports user accounts, cart/checkout flows, order history, and integrates with Supabase (auth, data) and Razorpay (payments).

This README documents the stack, setup, usage, environment configuration, project structure, and maintenance notes. It aims to reflect the current repository state without inventing unknowns; TODOs are included where details need to be finalized.

## Overview
- Static HTML + CSS + vanilla JavaScript (no build step).
- Tailwind CSS is loaded via CDN for styling.
- Supabase JS SDK (via CDN) is used for authentication and database access.
- Razorpay Checkout is included via CDN for payments.
- Product data and schema live in Supabase; CSV/SQL helpers are provided under `supabase/`.

Key user flows implemented in the frontend:
- Browse products and variants
- Add to cart, manage cart
- Sign up / Sign in (Supabase Auth)
- Checkout and create orders (Supabase DB)
- Optional Razorpay payment initiation
- View order history and manage profile/addresses

## Tech Stack
- Language: HTML5, CSS3, JavaScript (ES6+)
- UI: Tailwind CSS (CDN)
- Icons: Lucide (CDN)
- Backend as a Service: Supabase (Auth + Postgres + JS SDK)
- Payments: Razorpay Checkout (CDN)
- Hosting model: Any static host (Netlify, Vercel static, GitHub Pages, S3, etc.)
- Package manager: None required (no package.json); scripts load from CDN

## Requirements
- A modern browser
- A running Supabase project with tables from `supabase/setup.sql`
- (Optional) Razorpay account and key for live payments
- A local static file server for development (examples provided below)

## Setup and Run (Local)
Because this is a static site, you only need a simple HTTP server to develop locally. Choose one:

- Python 3 (built-in HTTP server)
  - macOS/Linux: `python3 -m http.server 8000`
  - Windows (if Python is `python`): `python -m http.server 8000`
  - Then open: http://localhost:8000/index.html or http://localhost:8000/shop.html

- Node.js (using npx serve – no project dependencies required)
  - `npx serve -l 8000`
  - Open: http://localhost:8000

Pages of interest:
- `/index.html` – Landing page
- `/shop.html` – Product listing, cart, checkout (primary entry point)
- `/order-history.html` – View past orders
- `/profile.html` – Profile and addresses
- `/about.html`, `/contact.html`, `/terms.html` – Static info pages

## Environment Configuration
Environment values are currently hardcoded for convenience and must be reviewed before production deployment.

- Supabase configuration (currently hardcoded in `js/supabase-client.js`):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

- Razorpay configuration (placeholder present in `js/shop.js`):
  - `RAZORPAY_KEY_ID`

Security and configurability TODOs:
- TODO: Externalize the above settings into a separate `js/config.js` (ignored by git) or into HTML `<meta>` tags read by JS, and do not commit live credentials.
- TODO: Provide example file `js/config.example.js` and update README accordingly.
- TODO: For production, use environment variables in your hosting platform and inject them at build/deploy time if a build step is introduced later.

## Data and Supabase Setup
- Schema and policies: see `supabase/setup.sql`
- Seed product catalog: `supabase/products.csv` with instructions in `supabase/IMPORT_INSTRUCTIONS.md`
- Additional helpers: `supabase/insert_products.sql`

Quick start for Supabase:
1. Create a Supabase project.
2. Run the SQL from `supabase/setup.sql` in the Supabase SQL editor to create tables and policies.
3. Import `supabase/products.csv` following `supabase/IMPORT_INSTRUCTIONS.md`.
4. Update `js/supabase-client.js` (or your externalized config) with your project URL and anon key.

## How to Run the App Flows
- Authentication: Provided by Supabase. Users can sign up/sign in from the UI; session state is managed in `js/auth.js` and `js/supabase-client.js`.
- Products and Cart: `js/services/ProductService.js` and `js/services/CartService.js` drive product loading and cart logic; `js/services/UIService.js` handles UI rendering and interactions.
- Orders: Creation and persistence occur during checkout via Supabase calls (see `js/shop.js` and helpers in `js/api-helpers.js`).
- Payments: Razorpay’s checkout script is included on `shop.html`. The key id is currently a placeholder and should be configured before enabling live payments.

## Scripts and Entry Points
There is no package.json; scripts are classic browser modules loaded by each HTML page via `<script>` tags.

Main JS files:
- `js/index.js` – Landing page interactions
- `js/shop.js` – Shop logic: product list, cart, checkout, payment flow
- `js/order-history.js` – Order history page logic
- `js/profile.js` – Profile and address management
- `js/about.js`, `js/contact.js` – Page-specific behaviors
- `js/supabase-client.js` – Supabase client init and auth state listeners
- `js/auth.js` – Authentication helpers
- `js/api-helpers.js` – API/data helpers used across pages
- `js/services/*.js` – UI, Product, and Cart services (SOLID-style separation)

CDN dependencies loaded in HTML:
- Tailwind CSS: `https://cdn.tailwindcss.com`
- Lucide Icons: `https://unpkg.com/lucide@latest`
- Supabase JS: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`
- Razorpay Checkout: `https://checkout.razorpay.com/v1/checkout.js`

## Testing
There are currently no automated tests in this repository.
- TODO: Add lightweight E2E smoke tests (e.g., Playwright) for critical flows: product list renders, add to cart, sign in, place order, view order history.
- TODO: Add unit tests for services under `js/services/` if a test runner is introduced.

## Project Structure
High-level layout:

- `index.html`, `shop.html`, `order-history.html`, `profile.html`, `about.html`, `contact.html`, `terms.html`
- `css/` – Page and component styles (in addition to Tailwind via CDN)
- `js/` – Page scripts, services, and helpers
  - `services/` – `UIService.js`, `ProductService.js`, `CartService.js`
- `assets/images/` – Product images
- `supabase/` – SQL, CSV, and setup instructions for the backend data
- `LICENSE` – MIT license
- `README.md` – This file

## Deployment
Because the site is static, you can deploy to any static host.
- Ensure environment values (Supabase URL/key and Razorpay key) are configured securely. See TODOs above.
- For Netlify/Vercel, you can deploy directly from this repo. If externalizing config, make sure not to commit secrets.

## License
This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
