# test_game

three.js F1 racing game (single `index.html`). Controls: WASD / arrows, or on-screen buttons on phones (landscape).

## Online ranking (optional)
`api/scores.js` is a Vercel serverless function that stores top times per circuit/lap count in Upstash Redis.
1. Vercel dashboard → this project → Storage → add an Upstash Redis (KV) database and connect it to the project
   (this sets `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
2. Redeploy. Without it the game still works and shows only this device's times.
