# 🌀 CU-BlitZ – Your Complete CUSIT Productivity Suite

CU-BlitZ is a feature-packed Chrome Extension designed specifically for `City University of Science and Information Technology (CUSIT)` students. It combines multiple productivity tools to streamline your university experience.

---

## 🚀 Features

### 📋 Evaluation Automation
- ✅ One-click auto-completion of teacher and course evaluation forms
- ✅ Automatically selects ratings and fills feedback comments
- ✅ Unlock your result page instantly without repetitive form filling
- ✅ Customizable ratings and comments via popup interface

### 📚 Assignment Tracker
- ✅ **Dashboard Widget**: View up to 5 pending assignments on your LMS dashboard
- ✅ **Header Icon**: Quick access with assignment count badge
- ✅ **View All Page**: Comprehensive list of all pending assignments organized by course
- ✅ **Refresh Button**: Manually update assignment status on demand
- ✅ **Smart Caching**: Auto-updates every hour to minimize server load
- ✅ **Direct Links**: Jump straight to assignment pages or upload pages

### 🔒 Privacy & Security
- ✅ 100% local — no remote code execution
- ✅ No data collection or external tracking
- ✅ Uses existing browser session (no password storage)
- ✅ Built by a student, for students

---

## 📂 Project Structure

```
CU-BlitZ/
├── manifest.json                          # Extension configuration
├── icons/                                 # Extension icons
├── features/
│   ├── evaluation-automation/             # Teacher/Course evaluation automation
│   │   ├── content.js                    # Auto-fill evaluation forms
│   │   ├── popup.html                    # Settings popup UI
│   │   └── popup.js                      # Popup logic
│   └── assignment-tracker/                # Pending assignments tracker
│       ├── background.js                  # Fetch & parse assignments
│       ├── content-dashboard.js           # Inject dashboard widget
│       ├── injected-styles.css            # Widget styling
│       ├── view-all.html                  # Full assignments page
│       ├── view-all.js                    # View all page logic
│       └── view-all.css                   # View all page styling
└── README.md                              # This file
```

---

## 🔧 How It Works

### Evaluation Automation
1. Open the extension popup from the toolbar
2. Select your default rating and enter a comment
3. Click "Save and Apply"
4. Visit any teacher or course evaluation page
5. The form auto-fills instantly, letting you submit and access results

### Assignment Tracker
1. Log in to CUSIT LMS (`https://cu.edu.pk/cpanelS/`)
2. Navigate to your dashboard
3. See pending assignments displayed above the Internal Marks table
4. Click the header icon or "View All" for detailed assignment information
5. Use the refresh button to update assignment status anytime

---

## Clone Repository

Type in `CMD` or `Terminal`:
```bash
git clone https://github.com/zaidkx7/CU-BlitZ.git
```

---

## 📦 Installation

### For Development

1. Clone or download this repository
2. Go to `chrome://extensions` in Chrome
3. Enable **Developer Mode** (toggle in top-right)
4. Click **"Load Unpacked"**
5. Select the `CU-BlitZ` folder
6. The extension is now active!

### From Chrome Web Store

Coming soon! (Currently in review)

---

## 🎯 Usage Guide

### Setting Up Evaluation Automation

1. Click the CU-BlitZ icon in your browser toolbar
2. Select your preferred rating (e.g., "Agree", "Strongly Agree")
3. Enter a default comment (e.g., "Great teaching!")
4. Click "Save and Apply"
5. Visit any evaluation page - it auto-fills instantly

### Using Assignment Tracker

**Dashboard Widget:**
- View up to 5 most recent pending assignments
- Click "View" to open the assignment page
- Click "View All" for the complete list
- Click the refresh icon (🔄) to fetch latest data

**View All Page:**
- Shows all pending assignments grouped by course
- Displays: Assignment number, title, description, deadline
- Click "View Assignment Page" to access the assignment
- Click "Upload Now" to submit your work
- Use the "Refresh" button to update the list

**Header Icon:**
- Located next to notifications in the top menu
- Shows count badge with total pending assignments
- Click to open the View All page

---

## 🛡️ Permissions Used

| Permission | Purpose | Used By |
|------------|---------|---------|
| `storage` | Store rating/comment preferences & cache assignment data | Both features |
| `scripting` | Inject evaluation automation scripts | Evaluation Automation |
| `host_permissions` | Access `cu.edu.pk` domain only | Both features |

✅ **No data is collected or sent anywhere.** Everything runs locally in your browser.

---

## 🔄 Updates & Caching

**Assignment Tracker:**
- Cache Duration: 1 hour (auto-refresh)
- Manual Refresh: Click the refresh button anytime
- Clear Cache: Use the refresh button to force update

**Evaluation Automation:**
- Settings persist across browser sessions
- Update anytime via the popup

---

## 🧠 Built With

- **JavaScript (Vanilla)** - No external dependencies
- **Chrome Manifest V3** - Latest extension standard
- **HTML/CSS** - Bootstrap 3.x compatible styling
- **Font Awesome** - Icons matching LMS theme

---

## 🐛 Troubleshooting

### Evaluation Automation Not Working
- Make sure you're on the evaluation page (`evalteacher.php` or `evalcourse.php`)
- Check that the popup shows your saved settings
- Try refreshing the page after saving settings

### Assignments Not Showing
- Verify you're logged in to the LMS
- Click the refresh button to clear cache
- Check the service worker console at `chrome://extensions/` for errors
- Ensure you have pending assignments (not uploaded)

### Extension Not Loading
- Verify all files are in the correct directories
- Check `chrome://extensions/` for error messages
- Reload the extension after any changes

---

## 📜 Privacy Policy

[View Privacy Policy](https://zaidkx7.github.io/privacy.html)

---

## 🎨 Screenshots

### Evaluation Automation Popup
*Configure ratings and comments in one click*

### Assignment Tracker Dashboard Widget
*See pending assignments right on your dashboard*

### View All Assignments Page
*Comprehensive view with all assignment details*

---

## 📢 License

This project is open-source and free under the [MIT License](LICENSE).

---

## 💬 Feedback & Support

Have suggestions, found a bug, or want to contribute?

- 📧 Email: **zaidkx37@gmail.com**
- 🐛 Issues: [GitHub Issues](https://github.com/zaidkx7/CU-BlitZ/issues)
- ⭐ Star this repo if you find it helpful!

---

## 🙏 Acknowledgments

Built with ❤️ by a CUSIT student, for CUSIT students.

Special thanks to everyone who provided feedback and testing!

---

## 📝 Changelog

### Version 2.0.0 (Current)
- ✨ Added Assignment Tracker feature
- 🗂️ Reorganized into feature-based directory structure
- ♻️ Optimized permissions for Chrome Web Store compliance
- 📝 Updated documentation

### Version 1.0.1
- 🐛 Bug fixes and improvements
- ✅ Initial evaluation automation feature

---

**Made for CUSIT students. By a CUSIT student. 🎓**
