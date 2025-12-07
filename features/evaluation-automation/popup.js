
document.getElementById("save").addEventListener("click", () => {
  const rating = document.getElementById("rating").value;
  const comment = document.getElementById("comment").value;

  chrome.storage.sync.set({ rating, comment }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          chrome.storage.sync.get(["rating", "comment"], (data) => {
            const { rating, comment } = data;
            const ratingMap = {
              "Strongly Agree": "1",
              "Agree": "2",
              "Uncertain": "3",
              "Disagree": "4",
              "Strongly Disagree": "5"
            };
            const selectedValue = ratingMap[rating] || "2";
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
        }
      });
    });
  });
});
