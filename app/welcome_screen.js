// app/welcome_screen.js
async function printWelcomeMessage() {
  const chalk = await import("chalk");

  console.clear();

  const banner = `
 Welcome to AI Shell!     
    Built with ❤️          

[+] Booting Codecrafters Shell...
[+] Environment loaded
[+] Awaiting your command, Operator 🧠


  ${chalk.default.cyanBright("Welcome to Codecrafters Shell! 🚀")}
  `;

  console.log(chalk.default.greenBright(banner));
}

module.exports = printWelcomeMessage;
