Generate a game item/prop asset prompt.
Game: {{genre}} | Style: {{style}}
Item: {{name}} | Description: {{description}}

Create a detailed AI image generation prompt. Include:
- Item shape, color, and material
- Animation consideration (rotation, glow)
- Style consistency with game art direction
- Transparent background specification

Output JSON: { basePrompt, negativePrompt, technicalSpec: { resolution, format, transparent, spriteSheetLayout } }
