# TODO — Chatbot Conversation Context Implementation

- [x] Inspect chatbot files
- [x] Create implementation plan & get approval
- [x] Fix types/chatbot.types.ts (add ChatIntent enum + ChatCard)
- [x] Fix services/intent-router.service.ts (add IntentResponse export)
- [x] Rewrite services/conversation.service.ts (in-memory Map, UUID, merge, expiry, cleanup)
- [x] Fix chatbot.service.ts (imports, entity merge, response shape)
- [x] Create chatbot.controller.ts
- [x] Rewrite dto/chatbot-response.dto.ts
- [x] Delete dto/chatbot-response.dto.ts.tmp
- [x] Register ConversationService in chatbot.module.ts
- [x] Add unit tests (conversation + chatbot service)
- [x] Run narrowest chatbot tests (npx tsx --test) — 28 pass
- [x] Run npm run build — passes
- [x] Run git diff --check — chatbot files clean; only pre-existing HeroSection.tsx trailing whitespace
