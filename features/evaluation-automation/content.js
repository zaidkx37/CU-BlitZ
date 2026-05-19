
const RATING_MAP = {
  "Strongly Agree": "1",
  "Agree": "2",
  "Uncertain": "3",
  "Disagree": "4",
  "Strongly Disagree": "5"
};

// --- Individual page auto-fill (existing feature) ---
chrome.storage.sync.get(["rating", "comment"], (data) => {
  const { rating, comment } = data;
  if (!rating || !comment) return;

  const selectedValue = RATING_MAP[rating] || "2";

  for (let i = 1; i <= 28; i++) {
    const radios = document.querySelectorAll(`input[name="q${i}"][value="${selectedValue}"]`);
    radios.forEach(r => r.checked = true);
  }

  for (let i = 1; i <= 9; i++) {
    const field = document.getElementById("cat" + i);
    if (field) field.value = comment;
  }

  const teacherComment = document.getElementById("teachercomment");
  const courseComment = document.getElementById("coursecomment");

  if (teacherComment) teacherComment.value = comment;
  if (courseComment) courseComment.value = comment;
});

// --- One-Click Bulk Evaluation ---
(function () {
  const path = window.location.pathname;
  const isTeacherEval = path.endsWith("/evalteacher.php");
  const isCourseEval = path.endsWith("/evalcourse.php");
  if (!isTeacherEval && !isCourseEval) return;

  const evalType = isTeacherEval ? "teacher" : "course";
  const linkSelector = isTeacherEval
    ? 'a[href*="teacherseval.php?"]'
    : 'a[href*="courseeval.php?"]';

  // Inject a fetch helper into the page's MAIN world so requests carry
  // the page's full cookie jar (PHPSESSID, cf_clearance, etc.)
  const helperScript = document.createElement("script");
  helperScript.src = chrome.runtime.getURL("features/evaluation-automation/page-fetch.js");
  document.documentElement.appendChild(helperScript);
  helperScript.onload = () => helperScript.remove();

  // Promise-based wrapper to talk to the injected page-world helper
  function pageFetch(url, options) {
    return new Promise((resolve, reject) => {
      const id = "cublitz_" + Math.random().toString(36).slice(2);
      function handler(e) {
        if (!e.data || e.data.type !== "CUBLITZ_FETCH_RESULT" || e.data.id !== id) return;
        window.removeEventListener("message", handler);
        if (e.data.error) reject(new Error(e.data.error));
        else resolve({ ok: e.data.ok, status: e.data.status, text: e.data.text });
      }
      window.addEventListener("message", handler);
      window.postMessage({ type: "CUBLITZ_FETCH", id, url, options }, "*");
    });
  }

  const style = document.createElement("style");
  style.textContent = `
    .cublitz-row-done td {
      background-color: #dff0d8 !important;
    }
    .cublitz-row-fail td {
      background-color: #f2dede !important;
    }
    .cublitz-status-icon {
      margin-left: 8px;
      font-weight: bold;
    }
    .cublitz-progress-area {
      margin-top: 15px;
      display: none;
    }
    .cublitz-progress-area.active {
      display: block;
    }
  `;
  document.head.appendChild(style);

  // Find the table's parent box
  const contentBox = document.querySelector(".box-body .table.table-bordered");
  if (!contentBox) return;
  const boxDiv = contentBox.closest(".box");
  if (!boxDiv) return;

  // Collect unique eval links
  const allLinks = contentBox.querySelectorAll(linkSelector);
  const seenHrefs = new Set();
  const evalEntries = [];
  allLinks.forEach(a => {
    const href = a.getAttribute("href");
    if (!href || seenHrefs.has(href)) return;
    seenHrefs.add(href);
    // Find the table row for this link to get course name + teacher
    const tr = a.closest("tr");
    const cells = tr ? tr.querySelectorAll("td") : [];
    const courseId = cells[0] ? cells[0].textContent.trim() : href;
    const courseName = cells[1] ? cells[1].textContent.trim() : "";
    const teacher = cells[2] ? cells[2].textContent.trim() : "";
    evalEntries.push({ href, courseId, courseName, teacher, tr });
  });

  if (evalEntries.length === 0) return;

  const evalLabel = isTeacherEval ? "Teacher Evaluations" : "Course Evaluations";

  // Build UI using native AdminLTE box styling
  // Insert inside the same col-md-12 that holds the table box
  const wrap = document.createElement("div");
  wrap.className = "box box-primary";
  wrap.innerHTML = `
    <div class="box-header with-border">
      <h3 class="box-title"><i class="fa fa-bolt"></i> CU-BlitZ: One-Click ${evalLabel}</h3>
      <span class="label label-info pull-right">${evalEntries.length} pending</span>
    </div>
    <div class="box-body">
      <div class="alert alert-info" style="margin-bottom:15px;">
        <i class="fa fa-info-circle"></i>
        <strong>Note:</strong> You can submit each evaluation individually by clicking the course links below,
        or you can submit all at once using the button here. Make sure you have set your preferred
        rating and comment in the CU-BlitZ popup first.
      </div>
      <button class="btn btn-success btn-lg" id="cublitz-bulk-start">
        <i class="fa fa-check-circle"></i> Complete All ${evalLabel} in One Click
      </button>
      <div class="cublitz-progress-area" id="cublitz-progress">
        <div class="progress" style="height:22px; margin-bottom:10px;">
          <div class="progress-bar progress-bar-success progress-bar-striped active" id="cublitz-bar-fill"
               role="progressbar" style="width:0%; line-height:22px; font-size:12px;">
            0 / ${evalEntries.length}
          </div>
        </div>
        <p class="text-muted" id="cublitz-status" style="margin:0;">Starting...</p>
        <div id="cublitz-result-summary" style="margin-top:10px;"></div>
      </div>
    </div>
  `;
  boxDiv.parentNode.insertBefore(wrap, boxDiv);

  const btn = document.getElementById("cublitz-bulk-start");
  const progressArea = document.getElementById("cublitz-progress");
  const barFill = document.getElementById("cublitz-bar-fill");
  const statusEl = document.getElementById("cublitz-status");
  const summaryEl = document.getElementById("cublitz-result-summary");

  btn.addEventListener("click", () => {
    chrome.storage.sync.get(["rating", "comment"], async (data) => {
      const { rating, comment } = data;
      if (!rating || !comment) {
        alert("Please set your preferred rating and comment in the CU-BlitZ popup first (click the extension icon).");
        return;
      }

      const selectedValue = RATING_MAP[rating] || "2";
      btn.disabled = true;
      btn.textContent = "Processing...";
      progressArea.classList.add("active");

      let completed = 0;
      let failed = 0;

      for (let i = 0; i < evalEntries.length; i++) {
        const entry = evalEntries[i];
        const current = i + 1;
        statusEl.textContent = `Submitting ${current}/${evalEntries.length}: ${entry.courseId} - ${entry.courseName}`;

        try {
          // Step 1: GET the individual eval page to extract hidden fields
          const pageUrl = new URL(entry.href, window.location.href);
          const getResp = await pageFetch(pageUrl.href);
          const html = getResp.text;

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const form = doc.querySelector("form#form_teacher");

          if (!form) {
            // Possibly already submitted or page structure changed
            throw new Error("Form not found (may already be completed)");
          }

          // Extract hidden fields
          const regno = form.querySelector('input[name="regno"]')?.value || "";
          const teacherid = form.querySelector('input[name="teacherid"]')?.value || "";
          const courseid = form.querySelector('input[name="courseid"]')?.value || "";
          const shift = form.querySelector('input[name="shift"]')?.value || "";
          const sessionid = form.querySelector('input[name="sessionid"]')?.value || "";
          const section = form.querySelector('input[name="section"]')?.value || "";

          // Build POST body
          const params = new URLSearchParams();
          params.append("regno", regno);
          params.append("teacherid", teacherid);
          params.append("courseid", courseid);
          params.append("shift", shift);
          params.append("sessionid", sessionid);
          params.append("section", section);

          if (evalType === "teacher") {
            // q1-q18
            for (let q = 1; q <= 18; q++) {
              params.append("q" + q, selectedValue);
            }
            params.append("teachercomment", comment);
            params.append("coursecomment", comment);
          } else {
            // q1-q28
            for (let q = 1; q <= 28; q++) {
              params.append("q" + q, selectedValue);
            }
            // cat1-cat9
            for (let c = 1; c <= 9; c++) {
              params.append("cat" + c, comment);
            }
          }
          params.append("submit", "Save");

          // Step 2: POST the submission
          const postResp = await pageFetch(pageUrl.href, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString()
          });

          if (!postResp.ok) {
            throw new Error(`Server responded with ${postResp.status}`);
          }

          // Mark row as done
          completed++;
          if (entry.tr) {
            entry.tr.classList.add("cublitz-row-done");
            const lastCell = entry.tr.querySelector("td:last-child");
            if (lastCell) {
              lastCell.innerHTML += '<span class="cublitz-status-icon" style="color:#28a745;">&#10004;</span>';
            }
          }
        } catch (err) {
          failed++;
          console.error(`CU-BlitZ: Failed to submit ${entry.courseId}:`, err);
          if (entry.tr) {
            entry.tr.classList.add("cublitz-row-fail");
            const lastCell = entry.tr.querySelector("td:last-child");
            if (lastCell) {
              lastCell.innerHTML += '<span class="cublitz-status-icon" style="color:#dc3545;">&#10008;</span>';
            }
          }
        }

        // Update progress
        const progress = Math.round((current / evalEntries.length) * 100);
        barFill.style.width = progress + "%";
        barFill.textContent = `${current} / ${evalEntries.length}`;

        // Small delay between requests to be respectful to the server
        if (i < evalEntries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      // Final summary
      btn.innerHTML = '<i class="fa fa-check"></i> All Done!';
      btn.className = "btn btn-default btn-lg disabled";
      barFill.classList.remove("active");
      if (failed === 0) {
        statusEl.textContent = "";
        summaryEl.className = "alert alert-success";
        summaryEl.innerHTML = '<i class="fa fa-check-circle"></i> ' +
          `${completed}/${evalEntries.length} evaluations completed successfully. You may refresh the page to verify.`;
      } else {
        statusEl.textContent = "";
        summaryEl.className = "alert alert-warning";
        summaryEl.innerHTML = '<i class="fa fa-exclamation-triangle"></i> ' +
          `${completed} completed, ${failed} failed. Failed ones may already be submitted or have changed.`;
      }
    });
  });
})();
