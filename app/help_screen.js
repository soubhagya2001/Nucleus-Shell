// help_screen.js
import chalk from "chalk";
import boxen from "boxen";

export default function printHelpScreen() {
  const helpMessage = `
${chalk.bold("🤖 AI & Configuration")}

${chalk.green("gemini <prompt>")} or ${chalk.green("ai <prompt>")}
  Engage with the Gemini AI. The AI can use tools and request to run shell
  commands (with your approval) to answer complex questions.
  ${chalk.cyan(
    "Example:"
  )} ai list all files in the current directory and count them
  ${chalk.cyan("Example:")} gemini what is the weather like in London?

${chalk.green("config <subcommand> [args]")}
  Manage the shell's configuration.
  ${chalk.cyan("Example:")} config get              # Show the current AI model
  ${chalk.cyan("Example:")} config set model <name> # Set a new AI model
  ${chalk.cyan("Example:")} config list models      # List recommended models

${chalk.bold("🛠 File System & Navigation")}

${chalk.green("cd [path]")}
  Change directory. Supports '~' for home. No path goes to home directory.
  ${chalk.cyan("Example:")} cd ~/projects
  ${chalk.cyan("Example:")} cd ..

${chalk.green("pwd")}
  Print the current working directory.
  ${chalk.cyan("Example:")} pwd

${chalk.green("ls, dir, ... (External Commands)")}
  Any command not listed here will be executed as an external program.
  ${chalk.cyan("Example:")} ls -l

${chalk.bold("📜 Shell Built-ins")}

${chalk.green("history [num] | [-c|-r|-w|-a] [file]")}
  Manage command history.
  ${chalk.cyan("Example:")} history         # Show all history
  ${chalk.cyan("Example:")} history 10      # Show last 10 commands
  ${chalk.cyan("Example:")} history -c      # Clear session history
  ${chalk.cyan("Example:")} history -w      # Write history to $HISTFILE

${chalk.green("echo [-n] <text>")}
  Print text. Use -n to suppress the trailing newline.
  ${chalk.cyan("Example:")} echo Hello World

${chalk.green("type <command>")}
  Identify if a command is a built-in or an external program.
  ${chalk.cyan("Example:")} type cd
  ${chalk.cyan("Example:")} type node

${chalk.green("exit [code]")}
  Exit the shell. You can also use ${chalk.bold.yellow("Ctrl+C")}.
  ${chalk.cyan("Example:")} exit
  ${chalk.cyan("Example:")} exit 1

${chalk.bold("🖥️ Platform-Specific Commands")}

${chalk.green("ps <command>")}
  Execute a command directly using PowerShell (if available).
  ${chalk.cyan("Example:")} ps Get-Process

${chalk.green("cmd <command>")}
  (Windows Only) Execute a command using the Windows Command Prompt.
  ${chalk.cyan("Example:")} cmd /c "echo %PATH%"

${chalk.bold("📦 Shell Features")}

${chalk.yellow("Piping (|)")}
  Use pipes to chain commands, passing the output of one to the next.
  ${chalk.cyan("Example:")} history | grep "config"

${chalk.yellow("Redirection (>, >>, 2>, 2>>)")}
  Redirect standard output and standard error to files.
  ${chalk.cyan("Example:")} ls -l > file.txt
  ${chalk.cyan("Example:")} node bad.js 2> error.log

${chalk.yellow("Tab Completion")}
  Press Tab to auto-complete built-in commands.

${chalk.yellow("Help")}
  Use ${chalk.green("help")} or ${chalk.green("--help")} to show this screen.
`;

  const boxed = boxen(helpMessage, {
    padding: 1,
    borderColor: "cyan",
    borderStyle: "round",
    title: chalk.blueBright.bold("Gemini Shell Help"),
    titleAlignment: "center",
  });

  console.log(boxed);
}
