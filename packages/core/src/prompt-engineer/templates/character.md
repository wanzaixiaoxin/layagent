Generate a game character asset prompt.
Game: {{genre}} | Style: {{style}}
Character: {{name}} | Description: {{description}}

Create a detailed AI image generation prompt. Include:
- Full character appearance with pose
- Style-specific rendering details
- Transparent background specification
- Game asset technical requirements
- Sprite sheet layout if animated

Output JSON: { basePrompt, negativePrompt, technicalSpec: { resolution, format, transparent, spriteSheetLayout } }
