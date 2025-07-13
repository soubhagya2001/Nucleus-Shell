import chalk from "chalk";
export function formatMarkdownToChalk(text) {
  // Bold: **text**
  text = text.replace(/\*\*(.*?)\*\*/g, (_, match) => chalk.bold(match));

  // Italic: *text*
  text = text.replace(/\*(.*?)\*/g, (_, match) => chalk.italic(match));

  // Headings (optional): ## Heading
  text = text.replace(/^## (.*)$/gm, (_, match) =>
    chalk.blueBright.bold(match)
  );

  // Bullets
  text = text.replace(
    /^\s*[-•] (.*)$/gm,
    (_, match) => chalk.green("• ") + match
  );

  return text;
}
