import chalk from "chalk";

export default async function printWelcomeMessage() {
  console.clear();

  const banner = `
 Welcome to AI Shell!     
    Built with ❤️          

[+] Booting Codecrafters Shell...
[+] Environment loaded
[+] Awaiting your command, Operator 🧠

  ${chalk.cyanBright("Welcome to Codecrafters Shell! 🚀")}
  `;

  console.log(chalk.greenBright(banner));
}
