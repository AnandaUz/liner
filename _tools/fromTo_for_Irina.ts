import '../_base/server/config'

import { google } from "googleapis";
import * as path from "path";
import { fileURLToPath } from "url";
import { promises as dns } from "dns";

// Принудительно устанавливаем публичные DNS-серверы Google для обхода ошибки ECONNREFUSED
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── НАСТРОЙКИ (меняй только здесь) ───────────────────────────────────────────

const SPREADSHEET_ID = process.env.G_DATA_PAGE_ID as string;

// Исходная вкладка (горизонтальные данные)
const SOURCE_SHEET = "irina-pred";
const SOURCE_RANGE = "A1:MH2"; // строка 1 — даты, строка 2 — вес; расширь если колонок больше

// Целевая вкладка (вертикальные данные)
const TARGET_SHEET = "irina";
const TARGET_START_ROW = 2; // с какой строки начинать запись (1 = с самого начала, 2 = пропустить заголовок)

// Путь к JSON-ключу сервисного аккаунта Google
const GOOGLE_KEY_PATH = path.join(__dirname, "../.data/key_for_migration_from_google_sheets.json");

// ──────────────────────────────────────────────────────────────────────────────

function parseWeight(value: unknown): number | null {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const s = value.trim().replace(/[\s\u00A0]/g, "").replace(",", ".");
    const parsed = parseFloat(s);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();

  // Формат DD.MM (без года) — добавим текущий год
  const matchShort = str.match(/^(\d{2})\.(\d{2})$/);
  if (matchShort) {
    const [, day, month] = matchShort;
    const year = new Date().getFullYear();
    return `${day}.${month}.${year}`;
  }

  // Формат DD.MM.YY или DD.MM.YYYY
  const matchFull = str.match(/^(\d{2})\.(\d{2})\.(\d{2,4})$/);
  if (matchFull) {
    let [, day, month, year] = matchFull;
    if (year && year.length === 2) year = "20" + year;
    return `${day}.${month}.${year}`;
  }

  return str; // вернём как есть если не распознали
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // ── Читаем исходные данные ──────────────────────────────────────────────────
  console.log(`Читаем данные из "${SOURCE_SHEET}"...`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SOURCE_SHEET}!${SOURCE_RANGE}`,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.error("Недостаточно данных: нужны хотя бы 2 строки (даты и вес)");
    process.exit(1);
  }

  const dateRow = rows[0] ?? [];
  const weightRow = rows[1] ?? [];

  // ── Парсим и формируем пары [дата, вес] ────────────────────────────────────
  const result: Array<[string, number]> = [];
  let skipped = 0;

  for (let i = 0; i < dateRow.length; i++) {
    const date = parseDate(dateRow[i]);
    const weight = parseWeight(weightRow[i]);

    if (!date) {
      console.warn(`Колонка ${i + 1}: неверная дата "${dateRow[i]}" — пропущена`);
      skipped++;
      continue;
    }

    if (weight === null) {
      console.warn(`Колонка ${i + 1}: неверный вес "${weightRow[i]}" — пропущена`);
      skipped++;
      continue;
    }

    result.push([date, weight]);
  }

  console.log(`Прочитано колонок: ${dateRow.length}, валидных: ${result.length}, пропущено: ${skipped}`);

  if (result.length === 0) {
    console.log("Нет данных для записи.");
    return;
  }

  // ── Записываем в целевую вкладку ────────────────────────────────────────────
  console.log(`\nЗаписываем в "${TARGET_SHEET}" начиная со строки ${TARGET_START_ROW}...`);

  const targetRange = `${TARGET_SHEET}!A${TARGET_START_ROW}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: targetRange,
    valueInputOption: "USER_ENTERED", // чтобы даты и числа распознавались корректно
    requestBody: {
      values: result, // [[дата, вес], [дата, вес], ...]
    },
  });

  console.log(`\nГотово: записано ${result.length} строк в "${TARGET_SHEET}"`);
}

main().catch((err) => {
  console.error("Ошибка:", err);
  process.exit(1);
});