import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { connectDB } from "./db.mjs";
import { WeightLog } from "./models/weightLog.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Явная загрузка .env из корня проекта
import dotenv from "dotenv";
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.warn(`Warning: .env file not found at ${envPath}`);
}

// Константа ID пользователя
const TARGET_USER_ID = "698ab21c79062c0864865e37"; // Замените на нужный ID
// Range A1:JX2 (First row: dates, Second row: weights)
const range = "A1:JX2";

async function runMigration() {
    try {
        const isTest = process.argv.includes("--test");
        const spreadsheetId = process.env.G_DATA_PAGE_ID;
        if (!spreadsheetId) {
            throw new Error("G_DATA_PAGE_ID is not defined in .env file");
        }
        const keyFile = path.join(__dirname, "..", ".data", "google_sheet_credentials.json");

        const auth = new google.auth.GoogleAuth({
            keyFile: keyFile,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        console.log(`Fetching data from spreadsheet: ${spreadsheetId}`);
        


        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;

        if (!rows || rows.length < 2) {
            console.log("No data found or insufficient rows (need at least 2 rows).");
            return;
        }

        const datesRow = rows[0];
        const weightsRow = rows[1];

        const result = [];
        const mongoOps = [];

        let currentYear = 2025;
        let lastMonth = -1;

        for (let i = 0; i < datesRow.length; i++) {
            let dateStr = String(datesRow[i] || "").trim();
            const weightStr = String(weightsRow[i] || "").trim();

            if (dateStr && weightStr) {
                let weight = parseFloat(weightStr.replace(",", "."));
                
                if (!isNaN(weight)) {
                    // Обработка даты вида "DD.MM" или "D.M"
                    if (dateStr.match(/^\d{1,2}\.\d{1,2}$/)) {
                        const [day, month] = dateStr.split(".").map(Number);
                        
                        if (lastMonth !== -1 && month < lastMonth) {
                            currentYear++;
                        }
                        lastMonth = month;

                        const fullDay = String(day).padStart(2, '0');
                        const fullMonth = String(month).padStart(2, '0');
                        
                        // Создаем объект даты (устанавливаем время в полдень, чтобы избежать проблем с часовыми поясами)
                        const dateObj = new Date(currentYear, month - 1, day, 12, 0, 0);
                        
                        result.push({
                            date: `${fullDay}.${fullMonth}.${currentYear}`,
                            weight: weight
                        });

                        mongoOps.push({
                            updateOne: {
                                filter: { userId: TARGET_USER_ID, date: dateObj },
                                update: { weight: weight },
                                upsert: true
                            }
                        });
                    }
                }
            }
        }

        console.log(`Parsed ${result.length} entries.`);
        
        if (isTest) {
            console.log("TEST MODE: Skipping database upload.");
            console.log("First 5 entries:", JSON.stringify(result.slice(0, 5), null, 2));
            console.log("Last 5 entries:", JSON.stringify(result.slice(-5), null, 2));
        } else {
            console.log("Connecting to database...");
            await connectDB();
            
            console.log(`Uploading ${mongoOps.length} records to MongoDB for user ${TARGET_USER_ID}...`);
            const bulkResult = await WeightLog.bulkWrite(mongoOps);
            console.log("Migration completed successfully:");
            console.log(`- Upserted: ${bulkResult.upsertedCount}`);
            console.log(`- Modified: ${bulkResult.modifiedCount}`);
            
            process.exit(0);
        }
        
    } catch (error) {
        console.error("Error during migration:", error);
        process.exit(1);
    }
}

runMigration();
