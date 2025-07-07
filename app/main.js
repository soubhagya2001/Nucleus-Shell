#!/usr/bin/env node

import readline from "node:readline";
import fs from "node:fs";
import { spawnSync, spawn } from "child_process";
import path from "node:path";
import { GeminiClient } from "./geminiClient.js"; // <-- Important to include .js extension
import printWelcomeMessage from "./welcome_screen.js"; // ✅ this now works
import chalk from "chalk";
import boxen from "boxen";
import { formatMarkdownToChalk } from "./helper.js";
import printHelpScreen from "./help_screen.js";
const geminiClient = new GeminiClient("gemini-2.5-flash");

// const { printWelcomeMessage } = require('./welcome_screen');

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

function getAbsPath(cmd) {
  if (!process.env.PATH) return false;
  const pathDirs = process.env.PATH.split(":");
  for (const dir of pathDirs) {
    if (fs.existsSync(`${dir}/${cmd}`)) {
      return `${dir}/${cmd}`;
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
        commands[cmd](...args.slice(1));
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
  exit: (code) => {
    if (process.env.HISTFILE) {
      try {
        fs.writeFileSync(process.env.HISTFILE, historyList.join("\n") + "\n");
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

  cd: (targetPath) => {
    if (!targetPath) {
      console.log("cd: missing argument");
      return;
    }
    if (targetPath === "~") {
      targetPath = process.env.HOME;
    }
    const resolvedPath = path.resolve(process.cwd(), targetPath);
    try {
      process.chdir(resolvedPath);
    } catch (err) {
      console.log(`cd: ${targetPath}: No such file or directory`);
    }
  },

  history: (...args) => {
    if (args[0] === "-r") {
      const filePath = args[1];
      if (!filePath) {
        console.error("history -r: missing file operand");
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
      const filePath = args[1];
      if (!filePath) {
        console.error("history -w: missing file operand");
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
      const filePath = args[1];
      if (!filePath) {
        console.error("history -a: missing file operand");
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

    // Support history [n]
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
    const prompt = args.join(" ").trim();
    if (!prompt) return console.log(chalk.yellow("Usage: gemini <question>"));

    const spinnerText = chalk.blueBright("🤖 Gemini is thinking...");
    console.log(spinnerText);

    const res = await geminiClient.ask(prompt);

    // Clear just the "Thinking..." line
    readline.moveCursor(process.stdout, 0, -1); // Move cursor up
    readline.clearLine(process.stdout, 0); // Clear the line
    readline.cursorTo(process.stdout, 0);
    const formatted = formatMarkdownToChalk(res);

    const decorated = boxen(formatted, {
      padding: 1,
      borderColor: "green",
      borderStyle: "round",
      title: chalk.green("Gemini AI Response"),
      titleAlignment: "center",
    });

    // console.clear(); // Optional: clear prompt line
    console.log(decorated);
  }
};
commands.ai = commands.gemini; // alias for user convenience

function safeRepl() {
  if (!rl.closed) {
    repl();
  }
}

function parseArgs(input) {
  const args = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      i++;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      i++;
      continue;
    }
    if (char === "\\") {
      const next = input[i + 1];
      if (inDoubleQuote && ['"', "\\", "$", "\n"].includes(next)) {
        current += next;
        i += 2;
        continue;
      }
      if (!inSingleQuote && !inDoubleQuote && next !== undefined) {
        current += next;
        i += 2;
        continue;
      }
      current += char;
      i++;
      continue;
    }
    if (char === " " && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
      i++;
    } else {
      current += char;
      i++;
    }
  }

  if (current.length > 0) {
    args.push(current);
  }
  return args;
}

function completer(line) {
  const lastSpaceIndex = line.lastIndexOf(" ");
  if (lastSpaceIndex !== -1 && line.substring(0, lastSpaceIndex).trim()) {
    return [[], line];
  }

  const wordToComplete = line.substring(lastSpaceIndex + 1);

  const allCommands = new Set(Object.keys(commands));
  if (process.env.PATH) {
    process.env.PATH.split(":").forEach((dir) => {
      try {
        if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
          fs.readdirSync(dir).forEach((file) => allCommands.add(file));
        }
      } catch (_) {}
    });
  }

  const hits = Array.from(allCommands)
    .filter((c) => c.startsWith(wordToComplete))
    .sort();

  if (hits.length === 0) {
    process.stdout.write("\x07");
    return [[], wordToComplete];
  }

  if (hits.length === 1) {
    return [[hits[0] + " "], wordToComplete];
  }

  const commonPrefix = hits.reduce((prefix, cmd) => {
    let i = 0;
    while (i < prefix.length && i < cmd.length && prefix[i] === cmd[i]) i++;
    return prefix.slice(0, i);
  });

  if (commonPrefix.length > wordToComplete.length) {
    return [[commonPrefix], wordToComplete];
  }

  process.stdout.write("\x07\n" + hits.join("  ") + "\n");
  process.stdout.write(`$ ${line}`);
  return [[], wordToComplete];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: completer,
  terminal: true,
});

function repl() {
  rl.question("$ ", (input) => {
    input = input.replace(/\r?\n/g, "").trim();
    if (!input) return safeRepl();

    historyList.push(input); // ✅ <-- Track command in history

    if (input.includes("|")) {
      handlePipeline(input);
      return;
    }

    let stdoutRedirect = null;
    let stderrRedirect = null;

    const stderrAppendMatch = input.match(/2>>\s*(\S+)/);
    if (stderrAppendMatch) {
      stderrRedirect = { path: stderrAppendMatch[1], flags: "a" };
      input = input.replace(/2>>\s*\S+/, "").trim();
    }

    const stderrMatch = input.match(/2>\s*(\S+)/);
    if (stderrMatch) {
      stderrRedirect = { path: stderrMatch[1], flags: "w" };
      input = input.replace(/2>\s*\S+/, "").trim();
    }

    const stdoutAppendMatch = input.match(/1?>>\s*(\S+)/);
    if (stdoutAppendMatch) {
      stdoutRedirect = { path: stdoutAppendMatch[1], flags: "a" };
      input = input.replace(/1?>>\s*\S+/, "").trim();
    }

    const stdoutMatch = input.match(/1?>\s*(\S+)/);
    if (stdoutMatch) {
      stdoutRedirect = { path: stdoutMatch[1], flags: "w" };
      input = input.replace(/1?>\s*\S+/, "").trim();
    }

    const args = parseArgs(input);
    const command = args[0];
    if (!command) return safeRepl();
    if (command === "help" || command === "--help" || args.includes("--help")) {
      printHelpScreen();
      return safeRepl();
    }

    const originalStdout = process.stdout.write;
    const originalStderr = process.stderr.write;

    if (commands[command]) {
      if (stdoutRedirect) {
        const outStream = fs.createWriteStream(stdoutRedirect.path, {
          flags: stdoutRedirect.flags,
        });
        process.stdout.write = outStream.write.bind(outStream);
      }
      if (stderrRedirect) {
        const errStream = fs.createWriteStream(stderrRedirect.path, {
          flags: stderrRedirect.flags,
        });
        process.stderr.write = errStream.write.bind(errStream);
      }

      try {
        const result = commands[command](...args.slice(1));
        if (result instanceof Promise) {
          result.then(() => {
            process.stdout.write = originalStdout;
            process.stderr.write = originalStderr;
            safeRepl();
          });
          return;
        }
      } catch (e) {
        console.error(e.message);
      }
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
      return safeRepl();

    }

    const stdio = ["inherit", "inherit", "inherit"];
    const fdsToClose = [];

    if (stdoutRedirect) {
      const fd = fs.openSync(stdoutRedirect.path, stdoutRedirect.flags);
      stdio[1] = fd;
      fdsToClose.push(fd);
    }

    if (stderrRedirect) {
      const fd = fs.openSync(stderrRedirect.path, stderrRedirect.flags);
      stdio[2] = fd;
      fdsToClose.push(fd);
    }

        const binaryPath = getAbsPath(command);
        if (binaryPath) {
          try {
            spawnSync(command, args.slice(1), { stdio });
          } catch (e) {
            console.error(e.message);
          } finally {
            fdsToClose.forEach(fs.closeSync);
          }
        } else {
          // Attempt fallback using PowerShell if available
          const pwsh =
            getAbsPath("pwsh") || getAbsPath("powershell") || "powershell.exe";
          if (pwsh) {
            try {
              spawnSync(pwsh, ["-Command", input], { stdio });
            } catch (e) {
              console.error(`PowerShell error: ${e.message}`);
            } finally {
              fdsToClose.forEach(fs.closeSync);
            }
          } else {
            console.error(`${command}: command not found`);
          }
        }



    safeRepl();
  });
}




(async () => {
  await printWelcomeMessage(); // ✅ NO SYNTAX ERROR inside async IIFE
  repl(); // ✅ Start the shell REPL
})();
