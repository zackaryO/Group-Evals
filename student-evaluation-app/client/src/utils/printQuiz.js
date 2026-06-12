// student-evaluation-app/client/src/utils/printQuiz.js
//
// Builds a clean, print-ready HTML document for a quiz and opens it in a new
// window for printing. Two modes:
//   - student version:   blank Name / Date / Score lines, no answers shown.
//   - instructor version: a bold red "INSTRUCTOR VERSION — ANSWER KEY" banner
//     and the correct choice for each question clearly marked.
//
// Print formatting guarantees (via the embedded @media print CSS):
//   - double spacing between questions, single spacing between a question and
//     its choices,
//   - a whole question (text + image + choices) never splits across a page
//     break (break-inside: avoid),
//   - long text and images wrap/scale so nothing overflows the page margins.

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Strip an author-typed leading number (e.g. "1. ", "2) ", "10: ") so it isn't
// printed twice — the printout already numbers questions from the list order.
// Deliberately narrow: requires a digit run followed by . ) or : AND a space,
// so it never eats content like "300-ohm" or "10% tolerance".
function stripLeadingNumber(text) {
  return String(text ?? '').replace(/^\s*\d{1,3}[.):]\s+/, '');
}

function renderQuestion(question, index, isInstructor) {
  const number = index + 1;
  const options = Array.isArray(question.options) ? question.options : [];
  // correctAnswer is stored as the option TEXT; find its position to letter it.
  const correctIndex = options.findIndex(
    (opt) => String(opt) === String(question.correctAnswer)
  );

  const imageHtml = question.image
    ? `<div class="q-image"><img src="${escapeHtml(question.image)}" alt="" /></div>`
    : '';

  let choicesHtml;
  if (options.length > 0) {
    choicesHtml =
      '<ol class="choices">' +
      options
        .map((opt, i) => {
          const isCorrect = isInstructor && i === correctIndex;
          const letter = OPTION_LETTERS[i] || String(i + 1);
          return (
            `<li class="choice${isCorrect ? ' choice-correct' : ''}">` +
            `<span class="choice-letter">${letter}.</span>` +
            `<span class="choice-text">${escapeHtml(opt)}</span>` +
            (isCorrect ? '<span class="choice-flag">&#10004; correct</span>' : '') +
            '</li>'
          );
        })
        .join('') +
      '</ol>';
  } else {
    // Open-ended question: give the student a line to write on.
    choicesHtml = '<div class="answer-line"></div>';
  }

  // For the instructor version, if the stored answer didn't match any listed
  // option (e.g. an open-ended or fuzzy answer), surface it on its own line.
  const strayAnswerHtml =
    isInstructor && correctIndex === -1 && question.correctAnswer
      ? `<div class="answer-key">Answer: ${escapeHtml(question.correctAnswer)}</div>`
      : '';

  return (
    '<li class="question">' +
    `<div class="q-text"><span class="q-number">${number}.</span> ${escapeHtml(
      stripLeadingNumber(question.questionText)
    )}</div>` +
    imageHtml +
    choicesHtml +
    strayAnswerHtml +
    '</li>'
  );
}

function buildHtml(quiz, isInstructor) {
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const title = escapeHtml(quiz.title || 'Quiz');

  const banner = isInstructor
    ? '<div class="instructor-banner">INSTRUCTOR VERSION &mdash; ANSWER KEY</div>'
    : '';

  const studentFields = !isInstructor
    ? '<div class="student-fields">' +
      '<div class="field"><span class="field-label">Name:</span><span class="field-line"></span></div>' +
      '<div class="field"><span class="field-label">Date:</span><span class="field-line"></span></div>' +
      '<div class="field"><span class="field-label">Score:</span><span class="field-line"></span></div>' +
      '</div>'
    : '';

  const questionsHtml = questions.length
    ? `<ol class="questions">${questions
        .map((q, i) => renderQuestion(q, i, isInstructor))
        .join('')}</ol>`
    : '<p class="empty">This quiz has no questions yet.</p>';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}${isInstructor ? ' (Instructor)' : ''}</title>
<style>
  /* Zero the page margin so the browser prints NO header/footer (page title,
     site URL, date, page number). Per-page margins are recreated below with a
     repeating thead/tfoot spacer table so EVERY page (not just the first/last)
     gets proper top and bottom whitespace. */
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.4;
    color: #000;
    /* Keep every element inside the page margins. */
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* The shell table: the browser repeats <thead> at the top and <tfoot> at the
     bottom of every printed page and reserves their height in the page layout,
     so content can never spill into the top/bottom margins. Left/right margins
     come from the cell padding (which also repeats on every page). */
  table.print-shell { width: 100%; border-collapse: collapse; }
  table.print-shell > thead > tr > td,
  table.print-shell > tfoot > tr > td,
  table.print-shell > tbody > tr > td { padding: 0 0.75in; border: 0; }
  /* Top / bottom margin on every page. */
  .page-spacer { height: 0.75in; }
  .instructor-banner {
    color: #c00000;
    font-weight: 700;
    font-size: 20pt;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 3px solid #c00000;
    padding: 8px;
    margin-bottom: 16px;
  }
  h1.quiz-title {
    font-size: 18pt;
    margin: 0 0 12px;
    text-align: center;
  }
  .student-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    margin: 0 0 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #000;
  }
  .field { display: flex; align-items: flex-end; gap: 6px; flex: 1 1 160px; }
  .field-label { font-weight: 700; white-space: nowrap; }
  .field-line { flex: 1 1 auto; border-bottom: 1px solid #000; min-width: 80px; height: 1.1em; }

  ol.questions { list-style: none; margin: 0; padding: 0; counter-reset: none; }

  /* Double spacing BETWEEN questions; a whole question never splits a page. */
  li.question {
    margin: 0 0 24pt;
    padding: 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Single spacing between the question text and its choices. */
  .q-text { margin: 0 0 4pt; }
  .q-number { font-weight: 700; margin-right: 4px; }

  .q-image { margin: 4pt 0; }
  .q-image img { max-width: 100%; max-height: 3.5in; height: auto; }

  ol.choices { list-style: none; margin: 0; padding: 0 0 0 1.6em; }
  li.choice { margin: 0; line-height: 1.4; display: flex; gap: 6px; align-items: baseline; }
  .choice-letter { font-weight: 700; min-width: 1.4em; }
  .choice-correct { color: #c00000; font-weight: 700; }
  .choice-flag { margin-left: 8px; font-style: italic; font-weight: 700; }

  .answer-line { margin-top: 6pt; border-bottom: 1px solid #000; height: 1.4em; }
  .answer-key { margin-top: 4pt; color: #c00000; font-weight: 700; }

  .empty { font-style: italic; }
</style>
</head>
<body>
  <table class="print-shell">
    <thead><tr><td><div class="page-spacer"></div></td></tr></thead>
    <tfoot><tr><td><div class="page-spacer"></div></td></tr></tfoot>
    <tbody><tr><td>
      ${banner}
      <h1 class="quiz-title">${title}</h1>
      ${studentFields}
      ${questionsHtml}
    </td></tr></tbody>
  </table>
  <script>
    // Print once everything (notably question images) has loaded, then close
    // the helper window when the print dialog is dismissed.
    window.addEventListener('load', function () {
      window.focus();
      window.print();
    });
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`;
}

/**
 * Open a print-ready window for the given quiz.
 * @param {object} quiz - quiz with populated `questions`.
 * @param {{ instructor?: boolean }} [opts]
 * @returns {boolean} false if the popup was blocked.
 */
export function printQuiz(quiz, { instructor = false } = {}) {
  const html = buildHtml(quiz, instructor);
  const win = window.open('', '_blank');
  if (!win) return false; // popup blocked
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

export default printQuiz;
