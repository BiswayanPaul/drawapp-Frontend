# DrawApp frontend

This project contains the Next.js user interface only. Authentication, room access,
database migrations, persistence, and WebSocket authorization run in the sibling
[`drawapp-backend`](../drawapp-backend) Express service.

## Local development

1. Configure and start the backend first (see its README).
2. Run `npm run dev`.

Open [http://localhost:3000](http://localhost:3000). `/api/*` is proxied to the
backend (`BACKEND_URL`, default `http://localhost:8080`) so its session cookie is
first-party; drawing sockets connect directly to `NEXT_PUBLIC_WS_URL`.
