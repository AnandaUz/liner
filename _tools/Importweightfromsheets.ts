
import '../_base/server/config' 

import { google } from "googleapis";
import { MongoClient, ObjectId } from "mongodb";
import * as path from "path";

// ─── НАСТРОЙКИ (меняй только здесь) ───────────────────────────────────────────

const USER_ID = "69d4cdc6f6b8cbfd259ba80d"; // мамин
// const USER_ID = "69d4a2977985a8e16b747559"; // мой локальный
const SPREADSHEET_ID = process.env.G_DATA_PAGE_ID as string;  // из URL таблицы
const SHEET_RANGE = "A2:E335";              // диапазон ячеек (без заголовка)

// const MONGO_URI = "mongodb://localhost:27017";
const MONGO_URI = process.env.MONGODB_URI as string
const MONGO_DB = process.env.MONGODB_BASE_NAME as string
const COLLECTION = "weightlogs";

// Путь к JSON-ключу сервисного аккаунта Google
const GOOGLE_KEY_PATH = path.join(__dirname, "../.data/key_for_migration_from_google_sheets.json");

let t=5
// ──────────────────────────────────────────────────────────────────────────────

interface IWeightLog {
  _id?: string;
  date: Date;
  weight: number;
  comment?: string;
}

function parseWeight(value: unknown): number | null {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    // Заменяем запятую на точку (европейский формат)    

    const s = value.trim().replace(/[\s\u00A0]/g, "").replace(",", ".");
    
    const normalized = s
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const str = String(value).trim();

  // Формат DD.MM.YY или DD.MM.YYYY
  const match = str.match(/^(\d{2})\.(\d{2})\.(\d{2,4})$/);
  if (match) {
    let [, day, month, year] = match;
    if (year && year.length === 2) year = "20" + year;
    const d = new Date(`${year}-${month}-${day}`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Фолбэк на стандартный парсинг
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

interface Item {
     date: Date; 
     weight: number;
     comment?:string | null
}
async function fetchFromSheets(): Promise<Array<Item>> {
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_RANGE,
  });

  const rows = response.data.values ?? [];
  const result: Array<Item> = [];
  let skipped = 0;

  

  for (let i = 0; i < rows.length; i++) {
     if (t <= 0) break
     t --

    const [rawDate, rawWeight, comment, f1,f2] = rows[i] || [];

    const date = parseDate(rawDate);
    let weight = parseWeight(rawWeight);
    
    let str_coment = ''
    if (f1) str_coment = '🌸'
     if(f2 ) 
          {
               let i = Number(f2)
               for (let index = 0; index < i; index++) {
                    str_coment = str_coment + '💧'                    
               }               
          }
if(comment) str_coment += comment

    if (!date) {
      console.warn(`Строка ${i + 2}: неверная дата "${rawDate}" — пропущена`);
      skipped++;
      continue;
    }

    if (weight === null) {
      console.warn(`Строка ${i + 2}: неверный вес "${rawWeight}" — пропущена`);
      skipped++;
      continue;
    }

    weight = weight/1000
    date.setHours(12,0,0,0)

    if (str_coment) result.push({ date, weight, comment:str_coment });
     else result.push({ date, weight });
  }

  console.log(`Прочитано строк: ${rows.length}, валидных: ${result.length}, пропущено: ${skipped}`);
  return result;
}

async function importToMongo(
  entries: Array<Item>
): Promise<void> {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const db = client.db(MONGO_DB);
  const collection = db.collection<IWeightLog>(COLLECTION);

  const userId = new ObjectId(USER_ID);

  let updated = 0;
  let inserted = 0;

  for (const entry of entries) {
    const result = await collection.updateOne(
      { userId, date: entry.date },
      { $set: entry.comment ? { weight: entry.weight, comment: entry.comment } : { weight: entry.weight } },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log(`✓ добавлено: ${entry.date.toISOString().slice(0, 10)} — ${entry.weight} кг ${entry.comment}`);
      inserted++;
    } else {
      console.log(`↻ обновлено: ${entry.date.toISOString().slice(0, 10)} — ${entry.weight} кг ${entry.comment}`);
      updated++;
    }
  }

  await client.close();

  console.log(`\nГотово: добавлено ${inserted}, обновлено ${updated}`);
}

async function main() {
  console.log("Загрузка данных из Google Sheets...");
  const entries = await fetchFromSheets();

  if (entries.length === 0) {
    console.log("Нет данных для импорта.");
    return;
  }

  console.log(`\nЗапись в MongoDB (userId: ${USER_ID})...`);
  await importToMongo(entries);
}

main().catch((err) => {
  console.error("Ошибка:", err);
  process.exit(1);
});