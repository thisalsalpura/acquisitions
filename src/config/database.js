import 'dotenv/config';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// When running against Neon Local in Docker Compose, use HTTP-only endpoint
// and disable WebSockets per Neon Local docs. We gate this on NODE_ENV so
// production continues to talk directly to Neon Cloud using the default config.
if (process.env.NODE_ENV === 'development') {
  // `neon-local` must match the service name in docker-compose.dev.yml
  neonConfig.fetchEndpoint = 'http://neon-local:5432/sql';
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

export { sql, db };
