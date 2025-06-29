# 🐚 Codecrafters Shell (Node.js)

A minimal shell implemented in Node.js as part of the [Codecrafters](https://codecrafters.io) "Build Your Own Shell" challenge. This shell supports built-in commands, redirection, pipelines, tab completion, and command history.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v16 or later recommended)
- Unix-like environment (Linux/macOS or WSL for Windows)

### Installation (via `npm link`)

```bash
git clone https://github.com/soubhagya2001/Shell-NodeJs
cd Shell-NodeJs
npm link
```

Then run your shell:

```bash
myshell
```

> `myshell` is the command name defined in `package.json`'s `"bin"` field.

---

## 🛠️ Features

- 🔢 Command history (`HISTFILE` support)
- 🚪 Built-in commands (`cd`, `exit`, `echo`, `pwd`, etc.)
- 🔄 Pipelining (`|`)
- 📂 Input/output redirection (`>`, `>>`, `2>`, `2>>`, `2>&1`)
- ⌨️ Tab auto-completion
- 🧠 Simple quoting and escaping

---

## 📦 Built-in Commands

### `exit [code]`
Exit the shell with optional exit code.

```sh
exit        # exits with code 0
exit 1      # exits with code 1
```

---

### `echo [-n] [args...]`
Print arguments to stdout.

```sh
echo hello world
echo -n "no newline"
```

---

### `type <command>`
Check if a command is a builtin or external.

```sh
type echo
type ls
```

---

### `pwd`
Print the current working directory.

```sh
pwd
```

---

### `cd <path>`
Change the current directory.

```sh
cd /home/user
cd ..
cd ~
```

---

### `history [-r file] [-w file] [-a file] [N]`
Manage and view command history.

- `history` — View entire history
- `history N` — Show last N commands
- `history -r file` — Read history from file
- `history -w file` — Write history to file (overwrite)
- `history -a file` — Append new history to file

---

## 🔁 Pipelining

Supports piping between multiple commands using `|`.

```sh
ls -l | grep ".js" | wc -l
```

---

## 🔀 Redirection

Supports output and error redirection.

| Symbol    | Meaning                       |
|-----------|-------------------------------|
| `>`       | Redirect stdout (overwrite)   |
| `>>`      | Redirect stdout (append)      |
| `2>`      | Redirect stderr (overwrite)   |
| `2>>`     | Redirect stderr (append)      |
| `2>&1`    | Redirect stderr to stdout     |

Examples:

```sh
ls > out.txt
ls notfound 2> err.txt
node app.js > out.txt 2>&1
```

---

## ⌨️ Tab Completion

- Works for built-in commands and executables in `PATH`.
- Supports prefix completion and lists options if multiple matches.

---

## 🧠 Quoting & Escaping

Supports:

- Single quotes (`'`) for literal strings
- Double quotes (`"`) for expanded strings
- Backslashes (`\`) for escaping characters

```sh
echo "This is a test"
echo 'Literal $HOME'
echo hello\ world
```

---

## 🌿 Environment Variables

### `HISTFILE`
Set the file to persist history across sessions.

```sh
export HISTFILE=~/.my_shell_history
my-shell
```

---

## 📁 File Structure

```text
.
├── app/
│   └── main.js        # Main shell implementation
├── package.json       # Defines CLI command via "bin"
└── README.md          # You're reading it!
```

---

## 🤝 License

MIT

---

## ✍️ Author

Built with ❤️ for Codecrafters challenge.
