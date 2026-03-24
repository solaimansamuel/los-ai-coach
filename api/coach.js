import { Client } from "@notionhq/client";
import OpenAI from "openai";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {

    const response = await notion.databases.query({
      database_id: process.env.DAILY_DB_ID,
      filter: {
        property: "AI Processed",
        checkbox: { equals: false }
      }
    });

    for (let page of response.results) {

      const props = page.properties;

      const event = props.Event.title[0]?.text.content || "";
      const category = props.Category.select?.name || "";
      const alignment = props.Alignment.select?.name || "";
      const trigger = props.Trigger.select?.name || "";

      const completion = await openai.chat.completions.create({
        model: "gpt-5.3",
        messages: [
          {
            role: "system",
            content: "You are a spiritual formation coach based on Hebrews 12:5–11."
          },
          {
            role: "user",
            content: `
Event: ${event}
Category: ${category}
Alignment: ${alignment}
Trigger: ${trigger}

Return:

Insight:
...

Coaching Instruction:
...

Action Step:
...

Fruit Prediction:
...
`
          }
        ]
      });

      const output = completion.choices[0].message.content;

      await notion.pages.create({
        parent: { database_id: process.env.COACH_DB_ID },
        properties: {
          "Insight": {
            rich_text: [{ text: { content: output } }]
          }
        }
      });

      await notion.pages.update({
        page_id: page.id,
        properties: {
          "AI Processed": { checkbox: true }
        }
      });
    }

    res.status(200).json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
