# docs/AGENTS.md – Quiz‑Image S3 Migration  
_Last updated: 2025‑07‑22_

## ⏱️ Emoji Legend

| Emoji | Meaning                              |
| ----- | ------------------------------------ |
| 🔴    | Backlog – not started                |
| 🔷    | WIP – actively being worked          |
| 🟢    | Done – merged to **main**            |
| ⚠️    | Blocked – waiting on input           |
| 📐    | Design – needs design review         |

> **Codex Agents‑of‑Record**  
>
> 1. **Update this `docs/AGENTS.md`** whenever a task changes status.  
> 2. **Append an entry to `docs/log.md`** (`YYYY‑MM‑DD · <commit‑hash> · <summary>`) for every status change or merge to **main**.  

---

## 📋 Task Board – Persist Quiz Images in AWS S3 (MERN stack)

| ID  | Description / Acceptance Criteria                                                                                                   | File(s) / Location(s)                                   | Owner | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----- | ------ |
| T‑1 | **Audit current quiz upload flow** – identify exact route/controller using Multer disk storage (`uploads/` folder). Create inline TODO markers. | `server/routes/quizzes.js` or `controllers/quizQuestionsController.js` | backend | 🟢 |
| T‑2 | **Add / verify env vars** – ensure `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUD_FRONT_URL` are in `.env.example` and Render dashboard. | `.env.example`, Render settings                         | DevOps | 🟢 |
| T‑3 | **Create S3 util** – reusable `uploadBufferToS3(buffer, key, mime)` that returns the absolute 🖼️ URL (CloudFront if available). Include unit test. | `server/utils/s3.js`, `tests/s3.test.js`                | backend | 🟢 |
| T‑4 | **Switch Multer to memory storage** for quiz image uploads (`storage: multer.memoryStorage()`). Remove local `uploads/` write.       | Quiz upload route file                                   | backend | 🟢 |
| T‑5 | **Refactor quiz create / update** – after Multer, call `uploadBufferToS3` and save `imageUrl` (full URL) in Mongo `QuizQuestion.image`. Remove `req.file.filename`. | Same as T‑4                                             | backend | 🟢 |
| T‑6 | **Remove Express static `/uploads` middleware** (no longer needed). Ensure other modules not dependent on it.                        | `server.js`                                             | backend | 🟢 |
| T‑7 | **Migration script** – iterate existing questions, read file from local `/uploads` (if exists), push to S3, update `image` field to new URL. Skip 404s. | `scripts/migrateQuizImagesToS3.js`                      | backend | 🟢 |
| T‑8 | **Front‑end editor** (`QuizQuestionForm.tsx`) – use `imageUrl` returned by API. Show preview from S3. No assumption of `/uploads/`.  | `client/src/components/quiz/QuizQuestionForm.tsx`       | frontend | 🟢 |
| T‑9 | **Front‑end player** (`TakeQuiz.tsx`) – load `question.image` as absolute URL. Remove local path concatenation logic.                 | `client/src/pages/TakeQuiz.tsx`                         | frontend | 🟢 |
| T‑10| **Image remove flow** – on “Remove Image” click, backend deletes S3 object (`deleteObject`) & nulls `image` in DB. Front‑end updates state. | Route: `DELETE /api/questions/:id/image`                | full‑stack | 🟢 |
| T‑11| **Permissions / IAM** – policy allows `s3:PutObject`, `s3:DeleteObject`, `s3:GetObject` on bucket path `quiz‑images/*`.               | AWS console / Terraform                                 | DevOps | 🔴 |
| T‑12| **E2E Cypress tests** – ① upload image ➜ persists after page reload ② image visible next day via mocked container restart.            | `cypress/e2e/quizImage.spec.js`                         | QA    | 🔴 |
| T‑13| **Remove obsolete `/uploads` directory** from repo; add `.gitkeep` only if other modules still rely; update `.gitignore`.             | root                                                    | backend | 🟢 |
| T‑14| **Docs update** – README + API docs with new `imageUrl` behaviour, env vars, migration instructions.                                 | `docs/api.md`, `README.md`                              | docs  | 🟢 |
| T‑15| **Code review & merge** – open PR, satisfy lint/tests, squash‑merge to `main`.                                                       | GitHub PR                                               | maint | 🔴 |

---

### Implementation Notes (for Codex)

- **Multer → memory:**  

  ```js
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }});
