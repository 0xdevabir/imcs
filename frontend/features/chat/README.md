# Chat Feature Module

This module owns all chat-domain code.

## Structure

- `components/`: UI sections used by the chat experience
- `contexts/`: React context providers and state scopes for chat
- `hooks/`: feature-scoped hooks for chat behavior
- `services/`: API/socket adapters and business logic helpers
- `types.ts`: shared chat feature types

Keep chat-only code inside this folder to make ownership and maintenance easier.
