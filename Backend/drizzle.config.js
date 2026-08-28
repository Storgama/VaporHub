import 'dotenv/config';

export default {
  schema: './src/db/schemas/index.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};