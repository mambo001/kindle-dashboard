import express from "express";
import path from "path";
import { captureNotesScreenshot as captureNotesScreenshotApi } from "./api";

const PORT = 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

function startServer() {
  const app = express();

  app.use(express.static(PUBLIC_DIR));

  app.get("/battery/:percentage", (req, res) => {
    console.log(`Battery update request: ${req.params.percentage}%`);
    const newBattery = parseInt(req.params.percentage);

    if (isNaN(newBattery) || newBattery < 0 || newBattery > 100) {
      return res
        .status(400)
        .send("Invalid battery value. Must be between 0 and 100");
    }

    BATTERY_PERCENTAGE = newBattery;

    captureNotesScreenshotApi(BATTERY_PERCENTAGE)
      .then(() => res.send(`Battery updated to ${BATTERY_PERCENTAGE}%`))
      .catch((error) => {
        console.error("Error updating screenshot:", error);
        res.status(500).send("Error updating screenshot");
      });
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Modify the main execution section at the bottom
// Make BATTERY_PERCENTAGE mutable
let BATTERY_PERCENTAGE = 40;

// Start the server and initial screenshot capture
startServer();
