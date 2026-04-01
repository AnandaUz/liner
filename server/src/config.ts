import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '../../.env')
// В Docker/Cloud Run переменные задаются через окружение, .env не нужен

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

