# .agents/commands/

Executable command definitions and templates for agent operations.

## Purpose
Store reusable command templates and scripts:
- Build commands
- Test commands
- Deploy commands
- Lint/format commands

## Suggested Files
- `build.md` - Build and deployment commands
- `test.md` - Testing commands and patterns
- `lint.md` - Linting and formatting commands
- `git.md` - Git workflow commands

## Quick Reference

### Frontend
```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

### Backend
```bash
cd backend
python main.py                        # Sample data
python main.py --data-path data.csv   # Custom data
python main.py --no-plots             # Headless
```
