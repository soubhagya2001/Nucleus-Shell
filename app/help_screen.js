// help_screen.js
import chalk from "chalk";
import boxen from "boxen";

export default function printHelpScreen() {
  const helpMessage = `
${chalk.bold("🛠 Built-in Commands")}

${chalk.green("cd <dir>")}
  Change the current working directory.
  ${chalk.cyan("Example:")} cd ~/projects

${chalk.green("pwd")}
  Print the current working directory.
  ${chalk.cyan("Example:")} pwd

${chalk.green("echo [-n] <text>")}
  Print text to the terminal. Use -n to suppress newline.
  ${chalk.cyan("Example:")} echo Hello World
  ${chalk.cyan("Example:")} echo -n No Newline

${chalk.green("type <command>")}
  Identify whether a command is a built-in or an external binary.
  ${chalk.cyan("Example:")} type cd

${chalk.green("history [-r|-w|-a] [file]")}
  Display or manage command history.
  ${chalk.cyan("Example:")} history             # Show all history
  ${chalk.cyan("Example:")} history -r file.txt # Read history from file
  ${chalk.cyan("Example:")} history -w file.txt # Write current history to file
  ${chalk.cyan("Example:")} history -a file.txt # Append new history to file

${chalk.green("exit [code]")}
  Exit the shell with an optional exit code.
  ${chalk.cyan("Example:")} exit
  ${chalk.cyan("Example:")} exit 1

${chalk.green("gemini <question>")}
  Ask a question to Gemini AI and get a response in Markdown-styled output.
  ${chalk.cyan("Example:")} gemini What is the speed of light?

${chalk.green("ai <question>")}
  Alias for the gemini command.
  ${chalk.cyan("Example:")} ai How to use async/await in JS?

${chalk.bold("📦 Shell Features")}

${chalk.yellow("Piping")}
  Use pipes to pass output between commands.
  ${chalk.cyan("Example:")} echo hello world | grep hello

${chalk.yellow("Redirection")}
  Redirect output and error streams to files.
  ${chalk.cyan("Example:")} echo test > out.txt
  ${chalk.cyan("Example:")} echo error 2> err.txt
  ${chalk.cyan("Example:")} echo both > out.txt 2>&1

${chalk.yellow("PowerShell Fallback")}
  Commands like Get-ExecutionPolicy are routed through PowerShell if available.
  ${chalk.cyan("Example:")} Get-ExecutionPolicy

${chalk.yellow("Tab Completion")}
  Press Tab to auto-complete built-in and external commands.

${chalk.yellow("Command History")}
  Previous commands are stored in memory and optionally to file if HISTFILE is set.

${chalk.bold("❓ Help")}

${chalk.green("help")}
  Show this help screen.

${chalk.green("--help")}
  Also shows help if passed as a command or argument.
  ${chalk.cyan("Example:")} --help
  ${chalk.cyan("Example:")} gemini --help
`;

  const boxed = boxen(helpMessage, {
    padding: 1,
    borderColor: "cyan",
    borderStyle: "round",
    title: chalk.blueBright("Shell Help & Examples"),
    titleAlignment: "center",
  });

  console.log(boxed);
}
