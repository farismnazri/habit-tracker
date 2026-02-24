export function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    process.env.DATABASE_URL = 'file:/home/pi/habit-tracker-data/db.sqlite';
  }
}
