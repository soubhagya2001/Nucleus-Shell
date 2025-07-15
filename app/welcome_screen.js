import chalk from "chalk";

export default async function printWelcomeMessage() {
  console.clear();

  const banner = `
 Welcome to Nucleus Shell!     
    Built with ❤️          

[+] Booting Nucleus Shell...
[+] Environment loaded
[+] Awaiting your command, Operator 🧠

  `;

  console.log(chalk.greenBright(banner));
}
