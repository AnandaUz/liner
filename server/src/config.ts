import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// В Docker/Cloud Run переменные задаются через окружение, .env не нужен
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
