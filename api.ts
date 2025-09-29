import sharp from "sharp";
import path from "path";
import fs from "fs";
import { chromium } from "playwright";

// const DASHBOARD_WIDTH = 1448;
// const DASHBOARD_HEIGHT = 1072;
const DASHBOARD_WIDTH = 1648;
const DASHBOARD_HEIGHT = 1246;
const PORT = 8080; // Different from the other weather server
const PUBLIC_DIR = path.join(process.cwd(), "public");

function formatDateTime() {
  const date = new Date();
  return date
    .toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Manila",
      hour12: true,
    })
    .replace(",", " |");
}

// Build the HTML with fixed dimensions optimized for Kindle
const styleString = `<style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        width: 1648px;
        height: 1246px;
        font-family: "Roboto", sans-serif;
        background-color: #ffffff;
        color: #000000;
        padding: 30px;
        overflow: hidden;
      }

      .dashboard-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .top-bar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 3px solid #000;
      }

      .logo-section {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .dashboard-title {
        font-size: 3rem;
        font-weight: bold;
        letter-spacing: 1px;
      }

      .status-badge {
        background-color: #000;
        color: #fff;
        padding: 8px 16px;
        font-size: 2rem;
        font-weight: bold;
      }

      .date-time-section {
        text-align: right;
        font-size: 2rem;
        line-height: 1.5;
      }

      .last-update {
        font-size: 2rem;
        color: #666;
        margin-top: 4px;
      }

      .main-grid {
        display: flex;
        gap: 20px;
        flex: 1;
        justify-content: space-between;
        align-items: stretch;
      }

      .card {
        background-color: #ffffff;
        border: 2px solid #000;
        padding: 25px;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #000;
      }

      .card-title {
        font-size: 2.5rem;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .card-meta {
        font-size: 2rem;
        color: #666;
        display: flex;
        gap: 15px;
      }

      .chores-card {
        flex: 1;
      }

      .task-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
        overflow: hidden;
        margin-bottom: 20px;
      }

      .task-item {
        display: flex;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px dotted #ccc;
        font-size: 3rem;
      }

      .task-item:last-child {
        border-bottom: none;
      }

      .task-checkbox {
        width: 2rem;
        height: 2rem;
        border: 2px solid #000;
        margin-right: 12px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .task-checkbox.completed {
        background-color: #000;
        color: #fff;
        font-size: 1.5rem;
        font-weight: bold;
      }

      .task-text {
        flex: 1;
        line-height: 1.3;
      }

      .task-text.completed {
        text-decoration: line-through;
        color: #999;
      }

      .task-priority {
        width: 20px;
        height: 4px;
        background-color: #000;
        margin-left: 10px;
      }

      .notes-content {
        font-size: 14px;
        line-height: 1.6;
        height: calc(100% - 80px);
        overflow: hidden;
      }

      .note-line {
        margin-bottom: 12px;
        padding-left: 20px;
        position: relative;
      }

      .note-line::before {
        content: "—";
        position: absolute;
        left: 0;
        top: 0;
        font-weight: bold;
      }

      .summary-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: calc(100% - 80px);
      }

      .summary-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #eee;
      }

      .stat-label {
        font-size: 14px;
        color: #666;
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background-color: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        margin-top: auto;
      }

      .progress-fill {
        height: 100%;
        background-color: #000;
      }

      .stats-row {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        font-size: 2rem;
        color: #666;
      }

      .weather-widget {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        border: 1px solid #000;
        margin-top: 10px;
      }

      .weather-icon {
        font-size: 32px;
      }

      .weather-info {
        flex: 1;
      }

      .weather-temp {
        font-size: 20px;
        font-weight: bold;
      }

      .weather-desc {
        font-size: 12px;
        color: #666;
      }

      .category-divider {
        width: 100%;
        height: 2px;
        background-color: #000;
        margin: 15px 0;
      }

      .item-count {
        background-color: #f0f0f0;
        padding: 2px 8px;
        font-size: 2rem;
        border-radius: 10px;
      }

      .device-status {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 10px;
      }
    </style>`;

// function getBatteryIcon(percentage: number): string {
//   if (percentage < 2) return getIconSvg("44", 48); // Battery EMPTY
//   if (percentage < 10) return getIconSvg("47", 48); // Battery LOW
//   if (percentage > 90) return getIconSvg("46", 48); // Battery FULL
//   return getIconSvg("45", 48); // Battery MEDIUM
// }

interface Note {
  id: string;
  title: string;
  text: string;
}

interface NoteListItem {
  isCompleted: boolean;
  description: string;
}

async function fetchNotes() {
  try {
    const response = await fetch(`http://192.168.100.69:42069/notes`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: Note[] = await response.json();
    console.log({ data });
    return data;
  } catch (error) {
    console.error("Error fetching notes:", error);
    throw error;
  }
}

function formatTextToNotes(text: string): NoteListItem[] {
  if (!text || typeof text !== "string") return [];
  return text
    .trim()
    .split("\n")
    .map((e) => ({
      isCompleted: e.includes("/"),
      description: e.split("]")[1].trim(),
    }));
}

async function createNotesImage(notes: Note[], batteryPercentage: number) {
  try {
    if (!Array.isArray(notes) || notes.length === 0) {
      throw new Error("Invalid data format");
    }

    const [chores, shoppingList] = notes.map((note) =>
      formatTextToNotes(note.text)
    );

    const renderTaskListItem = (listItem: NoteListItem) => {
      if (listItem.isCompleted) {
        return `
          <div class="task-item">
              <div class="task-checkbox completed">✓</div>
              <span class="task-text completed">${listItem.description}</span>
            </div>
        `;
      } else {
        return `
          <div class="task-item">
              <div class="task-checkbox"></div>
              <span class="task-text">${listItem.description}</span>
          </div>
        `;
      }
    };

    const renderChoresCard = (listItem: NoteListItem[]) => {
      const total = listItem.length;
      const notCompletedCount = listItem.filter((e) => !e.isCompleted).length;
      const completedCount = total - notCompletedCount;
      const completedPercentage = Math.ceil((completedCount / total) * 100);
      return `            
            <div class="card chores-card">
                <div class="card-header">
                    <h2 class="card-title">Chores</h2>
                    <div class="card-meta">
                        <span class="item-count">${completedCount} of ${total} done</span>
                    </div>
                </div>
                <div class="task-list">
                    ${listItem.map(renderTaskListItem).join("")}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 20%;"></div>
                </div>
                <div class="stats-row">
                    <span>${completedPercentage}% Complete</span>
                    <span>${notCompletedCount} Remaining</span>
                </div>
            </div>
          `;
    };

    const renderShoppingListCard = (listItem: NoteListItem[]) => {
      const total = listItem.length;
      const notCompletedCount = listItem.filter((e) => !e.isCompleted).length;
      const completedCount = total - notCompletedCount;
      const completedPercentage = Math.ceil((completedCount / total) * 100);
      return `            
            <div class="card chores-card">
                <div class="card-header">
                    <h2 class="card-title">Shopping List</h2>
                    <div class="card-meta">
                        <span class="item-count">${completedCount} of ${total} done</span>
                    </div>
                </div>
                <div class="task-list">
                    ${listItem.map(renderTaskListItem).join("")}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 20%;"></div>
                </div>
                <div class="stats-row">
                    <span>${completedPercentage}% Complete</span>
                    <span>${notCompletedCount} Remaining</span>
                </div>
            </div>
          `;
    };
    const htmlString = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>E-ink Dashboard</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
          ${styleString}
      </head>
      <body>
          <div class="dashboard-container">
              <div class="top-bar">
                  <div class="logo-section">
                      <h1 class="dashboard-title">Home Dashboard</h1>
                      <div class="status-badge">ACTIVE</div>
                  </div>
                  
                  <div class="date-time-section">
                      <div id="currentDate"></div>
                      <div class="device-status">
                        <div class="last-update">Last update: <span id="lastUpdate">${formatDateTime()}</span></div>
                        <span>|</span>
                        <div id="batteryPercentage"></div>
                      </div>
                      
                  </div>
              </div>

              <div class="main-grid">
                  ${renderChoresCard(chores)}
                  ${renderShoppingListCard(shoppingList)}
              </div>
          </div>

          <script>
              function updateDateTime() {
                  const now = new Date();
                  
                  const dateOptions = { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                  };
                  
                  const timeOptions = {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                  };
                  
                  document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', dateOptions);
                  document.getElementById('batteryPercentage').textContent = "Battery: ${batteryPercentage}%"
                  document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                  });
              }

              updateDateTime();
          </script>
      </body>
      </html>
    `;

    fs.writeFileSync(
      path.join(process.cwd(), "public", "dashapi.html"),
      htmlString
    );
    console.log("Dashboard HTML created successfully");
  } catch (error) {
    console.error("Error creating dashboard HTML:", error);
    throw error;
  }
}

export async function captureNotesScreenshot(batteryPercentage: number) {
  console.log("Starting screenshot capture...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: {
      width: DASHBOARD_WIDTH,
      height: DASHBOARD_HEIGHT,
    },
  });

  try {
    // First create the HTML file
    const notes = await fetchNotes();
    await createNotesImage(notes, batteryPercentage);

    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/dashapi.html`);

    // Wait for the content to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot
    const screenshot = await page.screenshot();
    console.log("Screenshot captured");

    // Process the image with Sharp
    const buffer = await sharp(screenshot)
      .png()
      .toBuffer();

    await sharp(buffer)
      .toColorspace("b-w")
      .removeAlpha()
      .rotate(90)
      .png()
      .toFile(path.join(PUBLIC_DIR, "dash.png"));

    console.log(`[${formatDateTime()}]: Final dashboard image created`);
  } catch (error) {
    console.error("Screenshot capture failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}
