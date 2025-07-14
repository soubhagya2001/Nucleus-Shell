import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";
import { exec } from "node:child_process";
import util from "node:util";

const execPromise = util.promisify(exec);

const SYSTEM_INSTRUCTION = `You are a helpful AI Assistant that follows a strict step-by-step protocol.

VERY IMPORTANT RULES:
1. Your response MUST be a single, valid JSON object.
2. The JSON object MUST have a "step" key with a string value of "think", "action", or "output".
3. **If "step" is "action", you MUST also include "tool" and "input" string keys.**
4. **If "step" is "think" or "output", you MUST also include a "content" string key.**

PLATFORM AWARENESS:
- You are on a '${process.platform}' machine. Use appropriate commands.
- For 'win32' (Windows), use 'dir', 'echo.', 'type'. To create a file, use 'echo. > filename.txt'.
- For 'linux' or 'darwin' (macOS), use 'ls', 'touch'.

Available Tools:
- runCommand(command: string): string
`;

export class GeminiClient {
  constructor(apiKey, modelName) {
    if (!apiKey) {
      // This is a programming error, not a user error.
      throw new Error("GeminiClient constructor requires an API key.");
    }
    if (!modelName) {
      throw new Error("GeminiClient constructor requires a model name.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    this.model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: {
        role: "model",
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      generationConfig: {
        response_mime_type: "application/json",
      },
    });

    this.chat = this.model.startChat({ history: [] });
  }

  /**
   * Statically checks if a model name is valid by attempting a real API call.
   * @param {string} apiKey - The user's Gemini API key.
   * @param {string} modelName - The name of the model to validate.
   * @returns {Promise<boolean>} - True if the model is valid, false otherwise.
   */
  static async validateModel(apiKey, modelName) {
    if (!apiKey || !modelName) return false;
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      // THIS IS THE CRUCIAL CHANGE.
      // getGenerativeModel() is lazy. We must perform a real, lightweight
      // operation like countTokens() to force an API call and truly
      // confirm the model exists and is accessible.
      await model.countTokens("validate"); // Send a dummy string.

      return true; // If countTokens() doesn't throw, the model is valid.
    } catch (error) {
      // This will now correctly catch errors for invalid model names like "test".
      // The API will throw an error, which we catch here.
      return false;
    }
  }

  async converse(message) {
    const result = await this.chat.sendMessage(message);
    const responseText = result.response.text();

    try {
      return JSON.parse(responseText);
    } catch (e) {
      throw new Error(
        `Failed to parse AI response. The AI did not return valid JSON. Response was: ${responseText}`
      );
    }
  }

  async runShellCommand(command) {
    console.log(chalk.blue(`  [Tool Executing] runCommand: ${command}`));
    try {
      const { stdout, stderr } = await execPromise(command);
      if (stderr) {
        return `Command produced an error: ${stderr}`;
      }
      return stdout.trim() || "Command executed successfully.";
    } catch (error) {
      return `Failed to execute command. Error: ${error.message}`;
    }
  }
}
