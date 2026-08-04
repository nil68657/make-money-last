# Make Money Last Instructions

## Project context

- Next.js 14 and TypeScript relocation-runway simulator exported as a static GitHub Pages site.
- Follow `.cursor/rules/ship-workflow.mdc` in addition to this file.
- Use npm and preserve the committed lockfile.

## Commands

- Install: `npm install`
- Develop: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Verification: `npm run health`, `npm run verify`, and `npm run verify:model`
- Live verification when required: `npm run verify:live`

## Implementation guidance

- Preserve browser-only operation and static-export compatibility.
- Keep financial assumptions explicit, centralized, and covered by model verification.
- Distinguish calculations from presentation; do not hide model logic in UI components.
- Avoid collecting or transmitting user-entered financial information.
- Keep charts accessible and ensure important results remain understandable without color alone.

## Verification

- Run the existing ship workflow’s scoped checks before requesting a commit or push.
- Use `GITHUB_PAGES=true npm run build` when validating Pages-specific behavior.
