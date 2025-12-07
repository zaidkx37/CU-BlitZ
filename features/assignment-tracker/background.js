// Background script for CULMS Assignment Tracker
// Handles fetching and parsing assignment data from the LMS

const CACHE_TTL = 3600000; // 1 hour in milliseconds
const LMS_BASE_URL = 'https://cu.edu.pk/cpanelS/';

// Listen for messages from content script or extension pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAssignments') {
    // Get tab ID only if message is from a content script on a web page
    // Extension pages (like view-all.html) have URLs starting with chrome-extension://
    // They don't have a content script listener, so we shouldn't try to send messages to them
    const isExtensionPage = sender.url?.startsWith('chrome-extension://');
    const tabId = (!isExtensionPage && sender.tab?.id) || null;
    handleFetchAssignments(tabId);
  }
  return true;
});

// Main function to fetch all assignments
async function handleFetchAssignments(tabId) {
  try {
    // Step 1: Fetch course list
    const courses = await fetchCourses();

    if (courses.length === 0) {
      await cacheAssignments([], true);
      sendAssignmentsToTab(tabId, []);
      return;
    }

    // Step 2: Fetch assignments for each course in parallel with progressive updates
    let allAssignments = [];
    let completedCourses = 0;
    const totalCourses = courses.length;

    // Create promises that update cache as they complete
    const assignmentPromises = courses.map(async (course) => {
      try {
        const courseAssignments = await fetchAssignmentsForCourse(course);
        
        // Add to running total
        allAssignments = [...allAssignments, ...courseAssignments];
        completedCourses++;
        
        // Update cache progressively (not complete until all done)
        const isComplete = completedCourses === totalCourses;
        await cacheAssignments(allAssignments, isComplete, completedCourses, totalCourses);
        
        return courseAssignments;
      } catch (err) {
        completedCourses++;
        // Still update progress even on error
        const isComplete = completedCourses === totalCourses;
        await cacheAssignments(allAssignments, isComplete, completedCourses, totalCourses);
        return [];
      }
    });

    // Wait for all to complete
    await Promise.all(assignmentPromises);

    // Step 3: Send final result to content script
    sendAssignmentsToTab(tabId, allAssignments);

  } catch (error) {
    console.error('Error fetching assignments:', error);
    await cacheAssignments([], true);
    sendAssignmentsToTab(tabId, [], error.message);
  }
}

// Fetch course list from mycourses.php
async function fetchCourses() {
  const url = `${LMS_BASE_URL}mycourses.php`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Accept': 'text/html',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch courses: ${response.status}`);
  }

  const html = await response.text();
  return parseCourses(html);
}

// Parse course list from HTML using regex
function parseCourses(html) {
  const courses = [];
  const seenCourses = new Set(); // To avoid duplicates

  // Match table rows with course links
  // Looking for: <a href="outline.php?courseid=...&section=...&teacherID=...&sess=...&cpsess=...">
  const linkPattern = /<a\s+href=['"]outline\.php\?([^'"]+)['"]\s*>([^<]+)<\/a>/gi;

  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const queryString = match[1];
    const courseId = match[2].trim();

    try {
      const urlParams = new URLSearchParams(queryString);

      // Get section directly from URL parameters
      const section = urlParams.get('section') || '';
      const teacherId = urlParams.get('teacherID');
      const session = urlParams.get('sess');
      const cpsess = urlParams.get('cpsess');

      // Create unique key to avoid duplicates
      const courseKey = `${courseId}-${teacherId}`;
      if (seenCourses.has(courseKey)) {
        continue;
      }
      seenCourses.add(courseKey);

      // Extract course title - it's in the next <a> tag after courseId
      const titleMatch = html.substring(match.index).match(/<\/a><\/td>\s*<td[^>]*><a[^>]*>([^<]+)<\/a>/);
      const courseTitle = titleMatch ? titleMatch[1].trim() : 'Unknown';

      // Default shift to Morning (most common, can be enhanced later)
      const shift = 'Morning';

      courses.push({
        courseId: courseId,
        courseTitle: courseTitle,
        section: section,
        teacherId: teacherId,
        session: session,
        cpsess: cpsess,
        shift: shift
      });
    } catch (err) {
      // Skip malformed course entries
    }
  }

  return courses;
}

// Fetch assignments for a specific course
async function fetchAssignmentsForCourse(course) {
  const url = `${LMS_BASE_URL}assignments.php?` +
    `courseid=${encodeURIComponent(course.courseId)}` +
    `&teacherID=${course.teacherId}` +
    `&section=${encodeURIComponent(course.section)}` +
    `&shift=${encodeURIComponent(course.shift)}` +
    `&sess=${encodeURIComponent(course.session)}` +
    `&cpsess=${course.cpsess}`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Accept': 'text/html',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assignments for ${course.courseId}: ${response.status}`);
  }

  const html = await response.text();
  return parseAssignments(html, course, url);
}

// Parse assignments from HTML using regex
function parseAssignments(html, course, assignmentPageUrl) {
  const pendingAssignments = [];

  // Find assignment table rows - look for rows with assignment data
  const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = trPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Skip evaluation remarks rows (they have colspan)
    if (rowHtml.includes('colspan')) {
      continue;
    }

    // Check if this row has an upload link (pending assignment)
    if (rowHtml.includes('asgupload.php')) {
      // Extract all <td> cells
      const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [];
      let cellMatch;

      while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
        cells.push(cellMatch[1]);
      }

      if (cells.length < 7) {
        continue;
      }

      // Extract assignment data from cells
      const assignmentNo = extractText(cells[0]);
      const title = extractText(cells[1]);
      const description = cells[2]; // Keep HTML for description
      const dateAdded = extractText(cells[5]);
      const lastDate = extractText(cells[6]);

      // Extract help file link
      const helpFileMatch = cells[3].match(/<a\s+href=['"]([^'"]+)['"][^>]*>([^<]+)<\/a>/);
      const helpFile = helpFileMatch ? helpFileMatch[1] : null;
      const helpFileName = helpFileMatch ? helpFileMatch[2].trim() : null;

      // Extract upload link
      const uploadLinkMatch = cells[7].match(/<a\s+href=['"]([^'"]+)['"]/);
      const uploadLink = uploadLinkMatch ? uploadLinkMatch[1] : null;

      const assignment = {
        assignmentNo: assignmentNo,
        title: title,
        description: description,
        helpFile: helpFile,
        helpFileName: helpFileName,
        dateAdded: dateAdded,
        lastDate: lastDate,
        uploadLink: uploadLink,
        courseId: course.courseId,
        courseTitle: course.courseTitle,
        assignmentUrl: assignmentPageUrl
      };

      pendingAssignments.push(assignment);
    }
  }

  return pendingAssignments;
}

// Helper function to extract text from HTML
function extractText(html) {
  if (!html) return '';
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Cache assignments in chrome.storage
async function cacheAssignments(assignments, isComplete = true, completedCourses = 0, totalCourses = 0) {
  await chrome.storage.local.set({
    assignmentCache: {
      lastFetched: Date.now(),
      ttl: CACHE_TTL,
      assignments: assignments,
      isComplete: isComplete,
      progress: {
        completed: completedCourses,
        total: totalCourses
      }
    }
  });
}

// Send assignments to content script (only if called from a tab)
async function sendAssignmentsToTab(tabId, assignments, error = null) {
  // If no tabId (message came from extension page), skip sending message
  if (!tabId) {
    return;
  }

  try {
    // Check if tab still exists before sending message
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      return;
    }

    // Send message to content script
    await chrome.tabs.sendMessage(tabId, {
      action: 'assignmentsReady',
      assignments: assignments,
      error: error
    });
  } catch (err) {
    // Tab was closed or navigated away - this is expected, silently ignore
  }
}

// Helper function to check if cache is stale
async function isCacheStale() {
  const result = await chrome.storage.local.get(['assignmentCache']);

  if (!result.assignmentCache) {
    return true;
  }

  const age = Date.now() - result.assignmentCache.lastFetched;
  return age >= result.assignmentCache.ttl;
}
