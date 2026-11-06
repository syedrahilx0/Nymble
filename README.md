# Nymble prototype (MERN)

A working web app that simulates the architecture from the paper *Nymble: Blocking Misbehaving Users in Anonymizing Networks*. Users get a pseudonymous Nymble ID and short-lived tokens, a simulated service checks those tokens, and administrators can blacklist a pseudonym so it is blocked on the very next request.

**Scope.** This is an academic prototype. It uses ordinary server-side tokens, not the paper's cryptographic protocol, and it has no Tor integration. A Nymble ID is a pseudonym: this server holds both the account and the ID mapping, so it shows pseudonymity, not true anonymity. The in-app notes say the same.

## Stack

React 18 + Vite + Tailwind + React Router (client) · Express (API) · MongoDB + Mongoose · JWT sessions · bcrypt password hashing (via `bcryptjs`, same algorithm, no native build step)

## Run it locally

You need Node 18+ and MongoDB. For MongoDB use either a local install (`mongod`) or a free MongoDB Atlas M0 cluster and paste its connection string into `MONGODB_URI`.

```bash
# 1. API
cd server
npm install
cp .env.example .env        # then set JWT_SECRET and NYMBLE_SECRET to long random strings
npm run seed                # creates demo data, prints credentials
npm run dev                 # http://localhost:5000/api

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to port 5000, so there is no CORS setup to do.

### Demo accounts (from `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@nymble.local | Admin@12345 |
| User | alice, bob, carol, dave, erin, frank `@nymble.local` | Demo@12345 |
| Blacklisted | mallory@nymble.local | Demo@12345 |
| Expired blacklist | trent@nymble.local | Demo@12345 |

The seed also prints a 24-hour Nymble token for alice that you can paste into Postman.

## Try the full flow

1. Sign in as **bob**, open *Service access*, click **Get a token**, then request **Whisper Board** and post something.
2. In another browser or private window, sign in as **admin**, open *Users*, and blacklist bob with a reason and a duration.
3. Back as bob, click **Refresh**. Access is denied immediately, with the reason and time left. Bob also cannot get a new token.
4. As admin, open *Blacklist* and lift it. Bob's old token stays revoked, so he gets a fresh one and is back in.

Users can also report a post from the feed. Reports land in the admin *Reports* queue, where an admin dismisses them or blacklists the pseudonym.

## Testing

```bash
cd server
npm run seed && npm start      # terminal 1
npm run smoke                  # terminal 2: 30 end-to-end API checks
```

Or import `postman/Nymble.postman_collection.json` into Postman and run the folders in order. Login requests save the JWTs and the Nymble token into collection variables, and most requests have test scripts.

## What is where

```
server/src
  models/       User, NymbleToken, Blacklist, AccessLog, ActivityLog, ServicePost, Report
  routes/       auth, pseudonym, service, reports, admin
  services/     token issuing, blacklisting, token verification
  middleware/   JWT auth + roles, zod validation, error handler
  seed.js       demo data
server/scripts/smoke.js
client/src
  pages/        user pages and admin pages
  components/   layout, Nymble ID card, modals, UI kit
postman/        collection
```

## API summary

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Pseudonym (user) | `GET /pseudonym/me`, `POST /pseudonym/token`, `DELETE /pseudonym/token` |
| Service | `GET /service/resources`, `POST /service/access`, `POST /service/posts` (token in `X-Nymble-Token`), `GET /service/history` |
| Reports (user) | `POST /reports`, `GET /reports/mine` |
| Admin | `GET /admin/stats`, `GET/DELETE /admin/users`, `GET/POST /admin/blacklist`, `DELETE /admin/blacklist/:id`, `GET/PATCH /admin/reports`, `GET /admin/logs/access`, `GET /admin/logs/activity` |

## Security notes

- Passwords are hashed with bcrypt (cost 12) and never returned by any endpoint. Roles are never accepted from the client.
- Nymble IDs are HMAC-SHA256 of the user id with `NYMBLE_SECRET`. Tokens are 256-bit random values; only their SHA-256 hash is stored, and the raw token is shown once.
- Every service request is verified on the server against the database, so blacklisting and revocation apply immediately.
- Input is validated with zod, responses use Helmet, and login and the API are rate limited.
- For a real deployment you would add HTTPS, refresh-token handling, and move JWTs out of localStorage. The prototype keeps them there for simplicity.

## Known limits

- Token and service state live in one database, which is the opposite of the paper's separation between Pseudonym Manager and Nymble Manager.
- The browser keeps the raw Nymble token in localStorage (per account) because the server cannot show it again.
