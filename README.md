# DrawApp frontend

This project contains the Next.js user interface only. Authentication, room access,
database migrations, persistence, and WebSocket authorization run in the sibling
[`drawapp-backend`](../drawapp-backend) Express service.

## Local development

1. Configure and start the backend first (see its README).
2. Copy `.env.example` to `.env.local` and point the public URLs at that service.
3. Run `npm run dev`.

Open [http://localhost:3000](http://localhost:3000). The frontend sends
credentialed requests to `NEXT_PUBLIC_API_URL` and opens drawing sockets at
`NEXT_PUBLIC_WS_URL`.
