import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function streamAndCollect(
  config: Record<string, any>,
  send?: (event: string, data: any) => void,
  eventName?: string
): Promise<string> {
  const stream = await openai.responses.create({
    ...config,
    stream: true,
  });

  let full = "";

  for await (const event of stream as AsyncIterable<any>) {
    if (event.type === "response.output_text.delta") {
      const token = event.delta || "";
      full += token;
      if (eventName && token) {
        send?.(eventName, { token });
      }
    }
  }

  return full;
}
