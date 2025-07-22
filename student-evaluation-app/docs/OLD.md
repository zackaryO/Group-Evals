# Codex Agents Task Board  
_Last updated: 2025‑07‑21_

## Legend

| Symbol / Tag | Meaning                              |
| ------------ | ------------------------------------ |
| 🔴 Backlog   | Not started                          |
| 🔷 WIP       | Work in progress                     |
| 🟢 Done      | Complete & merged                    |
| ⚠️ Blocked   | Needs decision / external dependency |
| 📐 Design    | Needs Figma / design sign‑off        |

> **Codex Agents‑of‑Record**  
>
> 1. **Update this `docs/AGENTS.md`** whenever a task changes status.  
> 2. **Append an entry to `docs/log.md`** with the date, commit hash, and a succinct description of the change.

---

## Tasks

| ID  | Description                                                                                                  | Owner       | Status | Notes |
| ----| ------------------------------------------------------------------------------------------------------------- | ----------- | ------ | ----- |
| T‑1 | Create/write‑able **uploads** directory on server start to eliminate `ENOTDIR` error                          | backend     | 🟢     | Add startup script or runtime check |
| T‑2 | Commit `.gitkeep` (or similar) so `uploads/` exists in deployments                                           | backend     | 🟢     | Required for Render / Vercel |
| T‑3 | Verify static route `app.use('/uploads', express.static('uploads'))` serves images correctly                  | backend     | 🟢     | Already present in codebase |
| T‑4 | Update **PUT** route to delete old image when a new one is uploaded                                           | backend     | 🔴     | Prevent orphaned files |
| T‑5 | Update **DELETE** question route to remove associated image file                                              | backend     | 🔴     | File‑system hygiene |
| T‑6 | Extend instructor UI: question‑creation form supports image upload via `<input type="file" …>`                | frontend    | 🔴     | Use `FormData`, show preview |
| T‑7 | Extend question‑edit dialog to allow replacing / removing an existing image                                   | frontend    | 🔴     | Handle PATCH / PUT |
| T‑8 | Render quiz‑question image for students (`<img src="/uploads/…">`)                                            | frontend    | 🟢     | Basic display already implemented |
| T‑9 | MVP enlarge: wrap image in `<a target="_blank">` to open full‑size in new tab                                 | frontend    | 🔴     | Quick win |
| T‑10| Enhanced UX: modal “lightbox” overlay to enlarge image in‑place                                              | frontend    | 🔴     | React state + CSS `.image-modal` |
| T‑11| Add reusable `.image-modal` CSS (centering, backdrop, close affordance)                                       | frontend    | 🔴     |  |
| T‑12| End‑to‑end tests: upload → display → enlarge flow works on desktop & mobile                                   | QA          | 🔴     | Cypress / Playwright |
| T‑13| Update developer docs & README sections covering image‑upload feature                                         | documentation| 🔴     | Explain folder, endpoints, modal usage |

---

### Next Steps

1. **Create the `uploads/` folder** locally and in CI environments.  
2. Mark *T‑1* through *T‑3* as 🟢 once verified, then begin front‑end tasks.  
3. Each commit that changes a task’s status **must** update this board **and** append a short entry to `docs/log.md` (date + commit hash + summary).  

---

