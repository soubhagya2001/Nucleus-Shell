import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".ai-shell");
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, "config.json");

// Default settings now only contain non-secrets.
const DEFAULTS = {
  model: "gemini-1.5-flash-latest",
};

function ensureConfigDirExists() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getConfig() {
  ensureConfigDirExists();
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    return DEFAULTS;
  }
  try {
    const fileContent = fs.readFileSync(CONFIG_FILE_PATH, "utf8");
    const config = JSON.parse(fileContent);
    // Merge with defaults to ensure a model is always present.
    return { ...DEFAULTS, ...config };
  } catch (error) {
    console.error("Error reading config file. Using defaults.", error);
    return DEFAULTS;
  }
}

export function setConfig(key, value) {
  // We only allow 'model' to be set here.
  if (key !== "model") {
    console.error("This key cannot be configured. Only 'model' is allowed.");
    return;
  }
  ensureConfigDirExists();
  const currentConfig = getConfig();
  currentConfig[key] = value;
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(currentConfig, null, 2));
    console.log(`Configuration updated: ${key} has been set.`);
  } catch (error) {
    console.error("Error writing to config file.", error);
  }
}
