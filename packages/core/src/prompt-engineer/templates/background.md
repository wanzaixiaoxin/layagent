Generate a game background asset prompt.
Game: {{genre}} | Style: {{style}}
Background: {{name}} | Description: {{description}}

Create a detailed AI image generation prompt. Include:
- Layer composition (foreground, midground, background)
- Parallax scrolling considerations
- Color atmosphere and lighting
- Seamless tiling specification

Output JSON: { basePrompt, negativePrompt, technicalSpec: { resolution, format, transparent, spriteSheetLayout } }
