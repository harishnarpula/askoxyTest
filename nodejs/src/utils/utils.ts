export function safeParse(text: string) {
  try {
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
      text = text.substring(start, end + 1);
    }

    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function flattenRules(rules: any[]) {
  return rules?.map(r => JSON.stringify(r)) || [];
}