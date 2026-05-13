Generate a game UI element asset prompt.
Game: {{genre}} | Style: {{style}}
UI Element: {{name}} | Description: {{description}}

Create a detailed AI image generation prompt. Include:
- Button/panel shape and style
- Color scheme matching game palette
- 9-slice scaling specification if applicable
- Glossy/bevel effects for depth
- Transparent background specification

Output JSON: { basePrompt, negativePrompt, technicalSpec: { resolution, format, transparent, spriteSheetLayout } }
