# ⚛️ Nucleus Shell: The AI-Powered Command Line


Welcome to **Nucleus Shell**, a modern, extensible shell built with Node.js. It integrates the power of Google's Gemini AI directly into your command line, acting as an intelligent assistant to streamline your workflow.

Nucleus combines a familiar shell environment—with support for pipes, redirection, and history—with a powerful AI core that can understand natural language, use tools to gather information, and execute commands on your behalf with your approval.

---

## ✨ Core Features

-   🧠 **AI Command Core**: Use the `nucleus` command to ask questions or give instructions in plain English. The AI can reason, run commands, and provide formatted output.
-   🔒 **Safe by Design**: The AI will **always** ask for your explicit confirmation before executing any potentially destructive or sensitive shell commands.
-   ⚙️ **Dynamic Configuration**: Easily view, set, and validate your preferred Gemini AI model using the built-in `config` command.
-   🛠️ **Standard Shell Functionality**: Includes essential commands like `cd`, `pwd`, `echo`, `history`, and `exit`.
-   🔄 **Pipes & Redirection**: Chain commands with pipes (`|`) and redirect standard output/error (`>`, `>>`, `2>`, etc.) just like in a standard shell.
-   🖥️ **Cross-Platform Wrappers**: Includes convenience commands like `ps` for PowerShell and `cmd` for the Windows Command Prompt.
-   ⌨️ **Tab Completion & History**: Enjoy tab auto-completion for commands and persistent command history via the `HISTFILE` environment variable.

---

## 🚀 Installation & Setup

Follow these steps to get Nucleus Shell running on your system.

### 1. Prerequisites

-   [Node.js](https://nodejs.org) (v18 or later is recommended)
-   [Git](https://git-scm.com/)

### 2. Clone the Repository

Clone this project from GitHub to your local machine.

```bash
git clone https://github.com/soubhagya2001/Nucleus-Shell.git
cd Nucleus-Shell
```

### 3. Install Dependencies

Install the required Node.js packages using `npm`.

```bash
npm install
```

### 4. Configure Your API Key

Nucleus Shell requires a Google Gemini API key to function.

1.  Create a `.env` file by copying the example template:
    ```bash
    cp .env.example .env
    ```
2.  Open the newly created `.env` file in your favorite text editor.
3.  Add your Gemini API key. The application is configured to look for `GEMINI_API_KEY`.
    ```ini
    # .env - Your private environment variables
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```

### 5. Make the Shell Globally Available

Use `npm link` to create a global symbolic link to the `nucleus` command, allowing you to run it from any directory on your system.

```bash
npm link
```

### 6. Run Nucleus Shell!

You're all set. Open a new terminal window and launch the shell.

```bash
nucleus
```
*(Note: The command name `nucleus` is defined in `package.json`)*

---

## 📚 Command Reference

### AI & Configuration

-   `gemini <prompt>` (alias: `ai`)
    -   Engage the AI core. Ask a question or give a command in natural language.
    -   *Example:* `gemini "list all markdown files and give me a one-sentence summary of each"`
    -   *Example:* `ai "what is the weather in London?"`

-   `config <subcommand>`
    -   Manages the shell's configuration.
    -   `config get`: Shows the currently configured AI model.
    -   `config set model <name>`: Sets and validates a new AI model for the AI core.
    -   `config list models`: Lists recommended Gemini models you can use.

### File System & Navigation

-   `cd [path]`
    -   Changes the current directory. Supports `~` for the home directory. `cd` with no arguments also navigates home.
    -   *Example:* `cd ~/projects`

-   `pwd`
    -   Prints the absolute path of the current working directory.

### Core Built-ins

-   `exit [code]`
    -   Exits the shell. You can also use **Ctrl+C** for a graceful exit.
    -   *Example:* `exit 1`

-   `echo [-n] <text>`
    -   Prints text to the console. The `-n` flag suppresses the trailing newline.

-   `type <command>`
    -   Identifies if a command is a shell built-in or an external program found in your `PATH`.

-   `history [num] | [-c|-r|-w|-a] [file]`
    -   Manages command history.
    -   `history 10`: Shows the last 10 commands.
    -   `history -c`: Clears the history for the current session.
    -   `history -w`: Writes the current session history to the file specified by `$HISTFILE`.

### Platform-Specific Commands

-   `ps <command>`
    -   Executes a command directly using PowerShell (if available on your system).
    -   *Example:* `ps Get-Process`

-   `cmd <command>`
    -   (Windows Only) Executes a command using the Windows Command Prompt (`cmd.exe`).
    -   *Example:* `cmd /c "echo %OS%"`

---

## 🌿 Environment Variables

-   `GEMINI_API_KEY` (**Required**)
    -   Your secret API key for accessing the Google Gemini services. The application will fail to start if this is not set in your `.env` file.
-   `HISTFILE` (**Optional**)
    -   Set the absolute path to a file where your command history will be persistently saved across sessions.
    -   *Example (in .bashrc or .zshrc):* `export HISTFILE=~/.nucleus_shell_history`

---

## 📁 File Structure

```text
.
├── main.js             # Main shell REPL and command dispatcher
├── geminiClient.js     # Handles communication with the Gemini API and tools
├── configManager.js    # Manages loading/saving of configuration
├── helper.js           # Utility functions (e.g., Markdown formatting)
├── welcome_screen.js   # The welcome message
├── help_screen.js      # The help message text
├── models.json         # A local list of recommended Gemini models
├── package.json        # Project dependencies and CLI command definition
├── .env                # (You create this) Your secret API key
├── .env.example        # Example environment file
└── README.md           # You are here!
```

