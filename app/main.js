#!/usr/bin/env node

import readline from "node:readline";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "child_process";
import path from "node:path";
import { GeminiClient } from "./geminiClient.js";
import printWelcomeMessage from "./welcome_screen.js";
import chalk from "chalk";
import boxen from "boxen";
import { formatMarkdownToChalk } from "./helper.js";
import printHelpScreen from "./help_screen.js";
import { getConfig, setConfig } from "./configManager.js";
import "dotenv/config.js";
// Use a modern model that is good for chat and supports JSON mode reliably.
// const geminiClient = new GeminiClient("gemini-1.5-flash-latest");

// ✅ On startup, check for the API key from the environment and exit if not found.
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(chalk.red("\n[FATAL ERROR] GEMINI_API_KEY not found in .env file."));
  console.error(chalk.yellow("The application cannot start. Please create a .env file and add your key."));
  process.exit(1);
}


const historyList = [];
let lastHistoryWriteIndex = 0;

if (process.env.HISTFILE) {
  try {
    const lines = fs
      .readFileSync(process.env.HISTFILE, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "");
    for (const line of lines) {
      historyList.push(line);
    }
    lastHistoryWriteIndex = historyList.length;
  } catch (err) {
    // If file doesn't exist or is unreadable, skip loading
  }
}

// ✅ CORRECTED: A single, clean helper function for user confirmation.
function askForConfirmation(query) {
    return new Promise(resolve => {
        // Pause the main REPL so it doesn't interfere with this question.
        rl.pause();
        rl.question(query, answer => {
            // Resume the main REPL once we have the answer.
            rl.resume();
            resolve(answer.trim().toLowerCase() === 'y');
        });
    });
}


function getAbsPath(cmd) {
  if (!process.env.PATH) return false;
  // Support both Windows and Linux path separators
  const separator = process.platform === "win32" ? ";" : ":";
  const pathDirs = process.env.PATH.split(separator);
  for (const dir of pathDirs) {
    try {
      if (fs.existsSync(`${dir}/${cmd}`)) {
        return `${dir}/${cmd}`;
      }
    } catch (e) {
      /* ignore errors for invalid paths */
    }
  }
  return false;
}

function applyRedirection(args) {
  let stdout = null;
  let stderr = null;
  const cleanedArgs = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === ">>") {
      const file = args[++i];
      stdout = fs.openSync(file, "a");
    } else if (args[i] === ">") {
      const file = args[++i];
      stdout = fs.openSync(file, "w");
    } else if (args[i] === "2>>") {
      const file = args[++i];
      stderr = fs.openSync(file, "a");
    } else if (args[i] === "2>") {
      const file = args[++i];
      stderr = fs.openSync(file, "w");
    } else if (args[i] === "2>&1") {
      stderr = "stdout";
    } else {
      cleanedArgs.push(args[i]);
    }
  }

  return { cleanedArgs, stdout, stderr };
}

function handlePipeline(input) {
  const segments = input.split("|").map((s) => s.trim());
  if (segments.length === 0 || segments[0] === "") {
    return setTimeout(safeRepl, 10);
  }

  const { PassThrough } = require("stream");
  const pipes = Array.from(
    { length: segments.length - 1 },
    () => new PassThrough()
  );
  const processes = [];
  let remaining = segments.length;

  segments.forEach((segment, i) => {
    const args = parseArgs(segment);
    const cmd = args[0];
    const isBuiltin = commands[cmd];

    const stdin = i === 0 ? process.stdin : pipes[i - 1];
    const stdout = i === segments.length - 1 ? process.stdout : pipes[i];

    if (isBuiltin) {
      const chunks = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };

      try {
        const result = commands[cmd](...args.slice(1));
        if (result instanceof Promise) {
          result.finally(() => {
            process.stdout.write = originalWrite;
            const output = Buffer.concat(chunks);
            if (stdout !== process.stdout) {
              stdout.write(output);
              stdout.end();
            } else {
              process.stdout.write(output);
            }
            if (--remaining === 0) setTimeout(safeRepl, 10);
          });
          return;
        }
      } catch (e) {
        chunks.push(Buffer.from(e.message + "\n"));
      }

      process.stdout.write = originalWrite;
      const output = Buffer.concat(chunks);

      if (stdout !== process.stdout) {
        stdout.write(output);
        stdout.end();
      } else {
        process.stdout.write(output);
      }

      if (--remaining === 0) setTimeout(safeRepl, 10);
    } else {
      const proc = spawn(cmd, args.slice(1), {
        stdio: ["pipe", "pipe", "inherit"],
      });

      if (stdin !== process.stdin) {
        stdin.pipe(proc.stdin);
      } else {
        proc.stdin.end();
      }

      proc.stdout.pipe(stdout);

      proc.on("close", () => {
        if (--remaining === 0) setTimeout(safeRepl, 10);
      });

      proc.on("error", (err) => {
        console.error(`${cmd}: command not found`);
        if (--remaining === 0) setTimeout(safeRepl, 10);
      });

      processes.push(proc);
    }
  });
}

const commands = {
  // main.js - inside the 'commands' object

  config: async (subcommand, ...args) => {
    // --- Case 1: Handle 'get' ---
    if (subcommand === "get") {
      // ... (this part is unchanged)
      const key = args[0];
      if (key && key !== "model") {
        console.log(
          chalk.red(`Invalid argument for 'get'. You can only get the model.`)
        );
        console.log(chalk.yellow("Usage: config get"));
        return;
      }
      const currentConfig = getConfig();
      console.log(`Current Model: ${currentConfig.model}`);
      return;
    }

    // --- Case 2: Handle 'set' ---
    if (subcommand === "set") {
      // ... (this part is unchanged)
      const key = args[0];
      const modelName = args.slice(1).join(" ");
      if (key !== "model") {
        console.log(
          chalk.red(
            "Invalid key. You can only set 'model'. Usage: config set model <model_name>"
          )
        );
        return;
      }
      if (!modelName) {
        console.log(
          chalk.red(
            "Error: Missing model name. Usage: config set model <model_name>"
          )
        );
        return;
      }
      console.log(
        chalk.yellow(`Validating model '${modelName}' with Google...`)
      );
      const isValid = await GeminiClient.validateModel(apiKey, modelName);
      if (!isValid) {
        console.log(chalk.red.bold(`\nValidation Failed!`));
        console.log(
          chalk.red(
            `Error: Model '${modelName}' is not a valid or accessible Gemini model.`
          )
        );
        console.log(
          chalk.yellow(
            "To see a list of available models, run: config list models"
          )
        );
        return;
      }
      console.log(chalk.green(`\nModel '${modelName}' is valid.`));
      setConfig("model", modelName);
      return;
    }

    // =================================================================
    // REWRITTEN SUBCOMMAND FOR LISTING MODELS FROM LOCAL FILE
    // =================================================================
    if (subcommand === "list") {
      const listType = args[0];
      if (listType !== "models") {
        console.log(
          chalk.red(`Invalid argument for 'list'. You can only list 'models'.`)
        );
        console.log(chalk.yellow("Usage: config list models"));
        return;
      }

      try {
        // Correctly locate models.json relative to this script file
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const modelsFilePath = path.join(__dirname, "models.json");

        const fileContent = fs.readFileSync(modelsFilePath, "utf8");
        const models = JSON.parse(fileContent);

        if (!models || models.length === 0) {
          console.log(
            chalk.yellow("Model list is empty or file is corrupted.")
          );
          return;
        }

        console.log(
          chalk.green.bold("\nAvailable Gemini Models (Recommended):")
        );
        models.forEach((model) => {
          console.log(`  - ${chalk.cyan(model.name)}`);
          console.log(`    ${chalk.gray(model.description)}`);
        });
        console.log(
          chalk.gray(
            "\nUse 'config set model <model_name>' to set your preferred model."
          )
        );
      } catch (error) {
        console.error(
          chalk.red("\nError: Could not read the local 'models.json' file.")
        );
        console.error(chalk.gray(error.message));
      }
      return;
    }
    // =================================================================
    // END OF REWRITTEN SUBCOMMAND
    // =================================================================

    // --- Default Case: Show help ---
    console.log(chalk.yellow.bold("\nConfig Command Usage:"));
    console.log(
      "  config get                     - View the currently set model."
    );
    console.log(
      "  config set model <model_name>  - Set your default AI model."
    );
    console.log(
      "  config list models             - Show recommended AI models and their capabilities."
    );
    console.log(
      chalk.gray("\n  (Your API key is loaded securely from the .env file)")
    );
  },

  exit: (code) => {
    if (process.env.HISTFILE) {
      try {
        const toWrite = historyList.slice(0).join("\n") + "\n";
        fs.writeFileSync(process.env.HISTFILE, toWrite);
      } catch (_) {
        // Ignore write errors
      }
    }
    rl.close();
    process.exit(code ? Number.parseInt(code) : 0);
  },

  echo: (...rest) => {
    let noNewline = false;
    if (rest[0] === "-n") {
      noNewline = true;
      rest = rest.slice(1);
    }
    const output = rest.join(" ");
    process.stdout.write(output + (noNewline ? "" : "\n"));
  },

  type: (command) => {
    if (commands[command]) {
      console.log(`${command} is a shell builtin`);
      return;
    }
    const absPath = getAbsPath(command);
    if (absPath) {
      console.log(`${command} is ${absPath}`);
    } else {
      console.log(`${command}: not found`);
    }
  },

  pwd: () => console.log(process.cwd()),

  cd: (...targetParts) => {
    // 1. Join all arguments to re-create the full path, including spaces.
    let targetPath = targetParts.join(" ");

    // 2. Handle the 'cd' command with no arguments (go to home directory).
    // This is standard behavior for shells like bash.
    if (!targetPath || targetPath.trim() === "") {
      targetPath = process.env.HOME || process.env.USERPROFILE; // USERPROFILE for Windows
    }

    // 3. Handle the tilde '~' for the home directory.
    if (targetPath === "~") {
      targetPath = process.env.HOME || process.env.USERPROFILE;
    }

    // Check if a target path is actually available after processing.
    if (!targetPath) {
      console.log(chalk.red("cd: HOME directory not set."));
      return;
    }

    // 4. Resolve the path relative to the current directory and attempt to change to it.
    const resolvedPath = path.resolve(process.cwd(), targetPath);
    try {
      process.chdir(resolvedPath);
    } catch (err) {
      // Provide a more helpful error message.
      if (err.code === "ENOENT") {
        console.log(`cd: ${targetPath}: No such file or directory`);
      } else {
        console.log(`cd: Error changing directory: ${err.message}`);
      }
    }
  },

  history: (...args) => {
    if (args[0] === "-c") {
      historyList.length = 0;
      lastHistoryWriteIndex = 0;
      return;
    }
    if (args[0] === "-r") {
      const filePath = args[1] || process.env.HISTFILE;
      if (!filePath) {
        console.error("history -r: no history file found");
        return;
      }
      try {
        const lines = fs
          .readFileSync(filePath, "utf8")
          .split("\n")
          .filter((line) => line.trim() !== "");
        for (const line of lines) {
          historyList.push(line);
        }
      } catch (e) {
        console.error(`history -r: ${e.message}`);
      }
      return;
    }

    if (args[0] === "-w") {
      const filePath = args[1] || process.env.HISTFILE;
      if (!filePath) {
        console.error("history -w: no history file to write to");
        return;
      }
      try {
        fs.writeFileSync(filePath, historyList.join("\n") + "\n");
        lastHistoryWriteIndex = historyList.length;
      } catch (e) {
        console.error(`history -w: ${e.message}`);
      }
      return;
    }

    if (args[0] === "-a") {
      const filePath = args[1] || process.env.HISTFILE;
      if (!filePath) {
        console.error("history -a: no history file to append to");
        return;
      }
      try {
        const toAppend = historyList.slice(lastHistoryWriteIndex);
        if (toAppend.length > 0) {
          fs.appendFileSync(filePath, toAppend.join("\n") + "\n");
          lastHistoryWriteIndex = historyList.length;
        }
      } catch (e) {
        console.error(`history -a: ${e.message}`);
      }
      return;
    }

    let start = 0;
    if (args[0] && /^\d+$/.test(args[0])) {
      const count = parseInt(args[0]);
      start = Math.max(historyList.length - count, 0);
    }

    historyList.slice(start).forEach((cmd, idx) => {
      console.log(`${start + idx + 1}  ${cmd}`);
    });
  },

  gemini: async (...args) => {
    const config = getConfig();

    const geminiClient = new GeminiClient(apiKey, config.model);

    const prompt = args.join(" ").trim();
    if (!prompt) {
      console.log(chalk.yellow("Usage: gemini <question>"));
      return;
    }

    let nextMessage = prompt;

    while (true) {
      try {
        const responseObj = await geminiClient.converse(nextMessage);

        if (!responseObj || typeof responseObj.step !== "string") {
          throw new Error(
            `Malformed response. Expected object with a 'step' string. Received: ${JSON.stringify(
              responseObj
            )}`
          );
        }

        switch (responseObj.step) {
          case "think":
            //  VALIDATE 'think' STEP
            if (typeof responseObj.content !== "string") {
              throw new Error(
                `Malformed 'think' step. 'content' must be a string. Received: ${JSON.stringify(
                  responseObj
                )}`
              );
            }
            console.log(chalk.italic.gray(`THINK: ${responseObj.content}`));
            nextMessage = "OK, continue.";
            break;

          case "action":
            //  VALIDATE 'action' STEP
            if (
              typeof responseObj.tool !== "string" ||
              typeof responseObj.input !== "string"
            ) {
              throw new Error(
                `Malformed 'action' step. 'tool' and 'input' must be strings. Received: ${JSON.stringify(
                  responseObj
                )}`
              );
            }

            console.log(
              chalk.yellow(
                `ACTION: Calling tool '${responseObj.tool}' with input: `
              ) + chalk.yellow.bold(`'${responseObj.input}'`)
            );

            let toolResult;
            if (responseObj.tool === "getWeatherInfo") {
              toolResult = await geminiClient.getWeatherInfo(responseObj.input);
            } else if (responseObj.tool === "runCommand") {
              const isApproved = await askForConfirmation(
                chalk.bgRed.bold(` DANGER `) +
                  chalk.red(
                    ` AI wants to run command: "${responseObj.input}". Approve? (y/N) `
                  )
              );
              if (isApproved) {
                console.log(
                  chalk.green("--> You approved. Executing command...")
                );
                toolResult = await geminiClient.runShellCommand(
                  responseObj.input
                );
              } else {
                console.log(chalk.red("--> You denied. Aborting command."));
                toolResult = "Command execution was denied by the user.";
              }
            } else {
              toolResult = `Error: Unknown tool '${responseObj.tool}'`;
              console.error(chalk.red(toolResult));
            }
            const observation = { step: "observe", content: toolResult };
            console.log(chalk.green(`OBSERVE: ${observation.content}`));
            nextMessage = JSON.stringify(observation);
            break;

          case "output":
            // VALIDATE 'output' STEP
            if (typeof responseObj.content !== "string") {
              throw new Error(
                `Malformed 'output' step. 'content' must be a string. Received: ${JSON.stringify(
                  responseObj
                )}`
              );
            }
            const finalAnswer = responseObj.content; // Now this is safe
            const decorated = boxen(formatMarkdownToChalk(finalAnswer), {
              padding: 1,
              borderColor: "cyan",
              borderStyle: "round",
              title: chalk.cyan("Gemini Replies"),
            });
            console.log(decorated);
            return;

          default:
            throw new Error(
              `Received unknown step string from AI: '${responseObj.step}'`
            );
        }
      } catch (error) {
        console.error(chalk.red(`\nAn error occurred: ${error.message}`));

        // This recovery logic now handles all our new validation errors too
        if (
          error.message.includes("Failed to parse") ||
          error.message.includes("Malformed")
        ) {
          console.log(
            chalk.yellow(
              "The AI returned invalid data. Asking it to correct itself..."
            )
          );
          const badResponse = error.message.substring(
            error.message.indexOf("Received:") ||
              error.message.indexOf("Response was:")
          );
          nextMessage = `Your previous response was malformed. Please review the rules VERY carefully and provide a single, valid JSON object. The invalid response was: ${badResponse}`;
          continue;
        }
        return;
      }
    }
  },

  ps: (...args) => {
    const psCommand = args.join(" ").trim();
    if (!psCommand) {
      console.error("Usage: ps <PowerShell command>");
      return;
    }
    const pwsh =
      getAbsPath("pwsh") || getAbsPath("powershell") || "powershell.exe";
    if (!pwsh) {
      console.error("PowerShell is not available on this system.");
      return;
    }
    try {
      spawnSync(pwsh, ["-Command", psCommand], { stdio: "inherit" });
    } catch (e) {
      console.error(`PowerShell error: ${e.message}`);
    }
  },

  cmd: (...args) => {
    if (process.platform !== "win32") {
      console.error("The 'cmd' command is only available on Windows.");
      return;
    }
    if (args.length === 0) {
      return console.log("Usage: cmd <Windows CMD command>");
    }
    const input = args.join(" ");
    try {
      spawnSync("cmd.exe", ["/C", input], { stdio: "inherit" });
    } catch (e) {
      console.error(`CMD error: ${e.message}`);
    }
  },
};
commands.ai = commands.gemini;

function safeRepl() {
  if (!rl.closed) {
    repl();
  }
}

function parseArgs(input) {
  // This regex handles spaces, single quotes, double quotes, and escaped quotes.
  return (
    input.match(/(".*?"|'.*?'|\S+)/g)?.map((arg) => {
      
      if (
        (arg.startsWith('"') && arg.endsWith('"')) ||
        (arg.startsWith("'") && arg.endsWith("'"))
      ) {
        return arg.slice(1, -1);
      }
      return arg;
    }) || []
  );
}

const completer = (line) => {
  const completions = Object.keys(commands);
  const hits = completions.filter((c) => c.startsWith(line));
  return [hits.length ? hits : completions, line];
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: completer,
  prompt: chalk.cyan("$ "),
  terminal: true,
});

// --- Main REPL (Read-Eval-Print-Loop) ---
function repl() {
  rl.question(rl.getPrompt(), (input) => {
    input = input.trim();
    if (!input) {
      return safeRepl();
    }

    historyList.push(input);

    if (input.includes("|")) {
      handlePipeline(input);
      return;
    }

    const args = parseArgs(input);
    const command = args[0];

    if (command === "help" || command === "--help" || args.includes("--help")) {
      printHelpScreen();
      return safeRepl();
    }

    // Simple redirection parsing (can be enhanced)
    const { cleanedArgs, stdout, stderr } = applyRedirection(args.slice(1));

    if (commands[command]) {
      try {
        const result = commands[command](...cleanedArgs);
        if (result instanceof Promise) {
          result.then(safeRepl).catch((err) => {
            console.error(chalk.red(err.message));
            safeRepl();
          });
        } else {
          safeRepl();
        }
      } catch (e) {
        console.error(chalk.red(e.message));
        safeRepl();
      }
      return;
    }

    const binaryPath = getAbsPath(command);
    if (binaryPath) {
      try {
        spawnSync(command, cleanedArgs, {
          stdio: ["inherit", stdout || "inherit", stderr || "inherit"],
        });
      } catch (e) {
        console.error(chalk.red(e.message));
      }
    } else {
      console.error(`${command}: command not found`);
    }
    safeRepl();
  });
}

// (async () => {
//   await printWelcomeMessage();

//   readline.emitKeypressEvents(process.stdin);
//   if (process.stdin.isTTY) {
//     process.stdin.setRawMode(true);
//   }

//   rl.on("SIGINT", () => {
//     console.log("^C");
//     repl();
//   });

//   process.stdin.on("keypress", (str, key) => {
//     if (process.stdin.isTTY) {
//       process.stdin.setRawMode(true);
//     }
//   });

//   repl();
// })();

(async () => {
  await printWelcomeMessage();

  // Handle Ctrl+C gracefully to exit the shell
  rl.on("SIGINT", () => {
    commands.exit();
  });

  // Start the main application loop
  repl();
})();