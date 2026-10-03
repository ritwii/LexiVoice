# LexiVoice — Voice Vocabulary Learning Agent

A voice-enabled vocabulary learning web application that trains active recall. Instead of passive flashcards, users are presented with a vocabulary word and must explain its meaning out loud (or in writing). The application evaluates whether the explanation semantically captures the true definition using an AI evaluator, provides educational coaching feedback, and adaptively schedules words for repetition until marked as **Learned**.

---

## Key Features

- **Active Voice Recall**: Speak answers directly using the browser's native Web Speech API (`SpeechRecognition`). Transcriptions are editable before submission.
- **Text-to-Speech (TTS)**: Listen to word pronunciation, question prompts, and coach evaluation feedback using `window.speechSynthesis`.
- **Semantic AI Evaluation**: Understands synonyms, paraphrasing, and conceptual understanding rather than requiring rote dictionary memorization. Validated using Zod schemas with a resilient local semantic evaluator fallback.
- **Adaptive Spaced Repetition**: Dynamic review intervals tailored to word difficulty (Easy, Medium, Hard) and past streaks.
- **Confidence Tracking**: Bounded confidence scores ($0.0 \to 1.0$) adjust with every answer attempt.
- **Vocabulary Import**: Drag-and-drop CSV and Excel (`.xlsx`, `.xls`) upload with column normalization, duplicate detection, and error resilience.
- **One-Click Sample Dataset**: Pre-loaded with 30 high-impact vocabulary words (10 Easy, 10 Medium, 10 Hard).
- **Progress Analytics**: Real-time dashboard showing total words, learned count, accuracy rate, today's reviews, difficulty breakdown, and recent attempts.

---

## Architecture

```text
                 ┌──────────────┐
                 │    User      │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   Next.js    │
                 │  React + UI  │
                 └──────┬───────┘
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
         Speech      Learning     LLM
         Service      Engine    Evaluator
             │          │          │
             └──────────┼──────────┘
                        ▼
            ┌────────────────────────┐
            │ Google Sheets Database │
            │   (Live Excel / CSV)   │
            └────────────────────────┘
```

---

## Requirements

- **Node.js**: v20+ (tested on v23.6.1)
- **Package Manager**: npm or pnpm

---

## Installation & Setup

1. **Clone or navigate to the repository:**
   ```bash
   cd vocabulary
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   `.env` options:
   ```env
   # Google Sheets / Excel Live Database URL
   # Add your Google Sheet URL (public/shared link or export link)
   GOOGLE_SHEET_URL="https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit?usp=sharing"

   # Optional LLM Configuration
   # If left empty, LexiVoice automatically uses an intelligent local semantic evaluator
   LLM_PROVIDER="openai"
   LLM_API_KEY=""
   LLM_MODEL="gpt-4o-mini"
   ```

4. **Google Sheets Database Setup:**
   - Create a Google Sheet with the following columns:
     - `word`
     - `definition`
     - `example_sentence`
     - `difficulty` (easy, medium, hard)
   - Share the sheet (Anyone with the link can view).
   - Paste the sheet link into `GOOGLE_SHEET_URL` in `.env`.
   - LexiVoice automatically fetches and parses the live spreadsheet as your database!
   - If `GOOGLE_SHEET_URL` is empty, it automatically falls back to the curated 30-word sample dataset.

---

## Development & Running

Start the local Next.js development server:

```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3000
```

---

## Running Tests

Run the full Vitest suite (Learning Engine, Import Pipeline, Evaluator):

```bash
npm test
```

---

## Spaced Repetition Scheduling

| Difficulty | Correct Review Interval | Incorrect Review Interval |
| :--- | :--- | :--- |
| **Easy** | 1 day $\to$ 3 days $\to$ 7 days $\to$ 14 days $\to$ 30 days | 10 minutes |
| **Medium** | 6 hours $\to$ 1 day $\to$ 3 days $\to$ 7 days $\to$ 14 days | 30 minutes |
| **Hard** | 1 hour $\to$ 6 hours $\to$ 1 day $\to$ 3 days | 10 minutes |

### Confidence Adjustment
- **Correct Answer**: $+0.15$
- **Incorrect Answer**: $-0.20$
- Clamped strictly between $0.00$ and $1.00$.

### Word Selection Priority
When selecting the next word to practice, the learning engine prioritizes:
1. Words whose `nextReview` is due (`nextReview <= now`).
2. Words with low confidence scores.
3. Words with higher incorrect counts.
4. Harder difficulty (`HARD` > `MEDIUM` > `EASY`).
5. Words never attempted (`attemptCount === 0`).
6. Excludes the word just seen (to avoid immediate consecutive repeats).
7. Words marked as `LEARNED` are removed from the active queue.

---

## Importing Custom Vocabulary

Navigate to `/import` to upload your own vocabulary files.

### Expected File Format (CSV or Excel)

| word | definition | example_sentence | difficulty |
| :--- | :--- | :--- | :--- |
| `meticulous` | Very careful and attentive to detail | She was meticulous when checking the report. | `medium` |
| `benevolent` | Well meaning and kindly | The benevolent person helped the poor. | `easy` |
| `sagacious` | Having sound judgment and wisdom | The elder provided sagacious counsel. | `hard` |

- **Supported file extensions**: `.csv`, `.xlsx`, `.xls`
- **Difficulty values**: `easy`, `medium`, `hard` (defaults to `medium` if empty or unknown).
- **Duplicate handling**: Words already present in the database or within the same file are detected and skipped without crashing the import.
