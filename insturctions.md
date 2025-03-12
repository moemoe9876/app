──────────────────────────────
2. Dashboard & Main Menu
Page 2: Dashboard Home
• Purpose: Serve as the central hub right after login—providing a welcoming overview, navigation links, and a summary of key performance metrics.
• Key Components:
 – Top Header: Displays the logo, app name (Ingestio.io), and a user profile icon (linking to Profile/Settings).
 – Navigation Sidebar or Top Navigation Bar: Links to “Upload Document,” “History,” “Performance Metrics,” and “Profile.”
 – Welcome Message & Announcement:
  • For example, “Welcome to Ingestio.io! Streamline your workflow with automated data extraction.”
  • Action button “Watch video →” alongside a small “Dismiss” control for the announcement.
 – Quick Overview Panel: A summary area (or cards) that shows aggregated metrics such as the total number of documents and extractions (if desired).
• Flow:
 – From the Dashboard Home, the user can click on any section. In this updated flow, there is a dedicated link in the navigation that takes the user to the Performance Metrics page (see Page 2A).
──────────────────────────────
2A. Performance Metrics Page
• Purpose: Display detailed key performance metrics that help users track their document processing and extraction workflow.
• Key Components:
 – Header: “Dashboard – Performance Metrics” (or simply “Metrics”).
 – Welcome Section:
  • A banner displays a friendly welcome (“Welcome to Ingestio.io!”) along with a short explanatory note (e.g., “Your workflow performance at a glance”).
 – Metrics Dashboard Panels / Cards:
  1. Documents Overview Card:
   – Total Documents: (e.g., 1)
   – Processed Documents: (e.g., 1)
   – Pending Documents: (e.g., 0)
  2. Extractions Breakdown Card:
   – Categories could be displayed as:
    • Content: 1 document (100%)
    • Others: 0 documents (0%)
    • Total: 1 document (100%)
  3. Efficiency & Savings Card:
   – Time Saved: (e.g., “3 minutes”)
   – Cost Savings: (e.g., “$1”)
  4. Language Preferences Card:
   – Languages: (e.g., “English”)
 – Visual Elements:
  • Progress bars, percentage circles, or icon-based metrics to visually represent percentages and savings.
  • Responsive grid layout to organize the cards neatly.
• Flow:
 – The page loads in real time with data pulled from Firestore (Firebase Cloud Firestore listeners) so that users see the most recent metrics.
 – A “Refresh” option (or auto-refresh) ensures metrics remain up-to-date.
 – Navigation back to the Dashboard Home or other pages via the consistent header/menu.
──────────────────────────────
3. Document Upload
Page 3: Document Upload Page
• Purpose: Allow users to submit a new document for processing using an intuitive file selection interface.
• Key Components:
 – A prominent drag-and-drop area with text instructions (e.g., “Drag and drop your PDF or image file here”).
 – An alternative “Browse” or “Select File” button for manual selection.
 – A display area that shows file name, size, and file type immediately on selection.
 – A visual progress indicator that appears once the file is submitted.
• Flow:
 – On file selection, the system uploads the document to Firebase Storage, creates a corresponding metadata record in Firestore, and immediately transitions to the Processing State page.
──────────────────────────────
4. Document Processing
Page 4: Processing State / Loading Modal
• Purpose: Provide users with real-time feedback that their document is being processed (via backend processing using Gemini 2 flash model and/or optionally Document AI).
• Key Components:
 – A persistent progress bar (e.g., “Processing your document… 50% complete”).
 – Status messages (e.g., “Extracting data,” “Validating fields,” etc.).
 – An animated spinner or similar loading indicator.
• Flow:
 – Once processing begins, the user sees the processing overlay or dedicated screen.
 – When processing completes (using real-time updates via WebSockets or Firestore listeners), the user is automatically redirected to the Document Review page.
──────────────────────────────
5. Document Review & Verification
Page 5: Document Review / Confirmation Page
• Purpose: Allow users to inspect the extracted content, verify data accuracy, and make inline corrections as needed.
• Layout: Two-pane (split view) design.
 – LEFT PANE: Data Extraction Panel
  • Shows key-value pairs (e.g., “invoice_number: 12345”) in a table/card format.
  • Each data field is editable inline.
 – RIGHT PANE: Document Preview Panel
  • Embeds a document viewer for PDF/image preview with controls for zoom, pan, and navigation.
  • Optionally supports coordinate-based highlighting that syncs with the left pane selections.
• Key Components:
 – “Confirm” or “Save Changes” button that commits any inline edits.
 – “Export” button (enabled after confirmation) to proceed to export the extracted data.
• Flow:
 – Users review and optionally correct the extracted data.
 – Adjust filtering (if necessary) to highlight low-confidence values.
 – After verifying and editing, users click “Confirm” which updates the extraction status.
──────────────────────────────
6. Data Export
Page 6: Export Modal / Export Page
• Purpose: Let the user choose the preferred file format (JSON, CSV, Excel) and customize export options for downloading the finalized data output.
• Key Components:
 – Export Options:
  • Buttons/icons for JSON, CSV, and Excel (XLSX).
  • Optional settings, such as a checklist for selecting/deselecting specific fields.
 – Preview/Summary Area:
  • Shows document name and chosen export settings.
 – “Download” button:
  • Either triggers an immediate file download or generates a secure download link.
• Flow:
 – Triggered from the Document Review page once the user clicks “Export.”
 – Upon confirmation and export processing, the file/download link is made available.
 – The user is then redirected back to the Dashboard (or History) where the document appears as processed.
──────────────────────────────
7. Document History & Audit Trail
Page 7: Document History Page
• Purpose: Offer a log of all processed documents for future reference, re-download, or reprocessing.
• Key Components:
 – A list or table view with columns for:
  • Document Name
  • Upload Date/Time
  • Document Type (if applicable)
  • Processing Status (e.g., success, error, pending review)
  • Links to download confirmed exports (JSON, CSV, Excel)
 – Search and filter controls (by date, type, or status).
 – Detailed view available on clicking a document entry, including extraction results, revisions, and audit history.
• Flow:
 – Accessible via the main navigation sidebar.
 – Users can click entries to view detailed results or trigger re-downloads.
──────────────────────────────
8. (Optional) User Profile & Settings
Page 8: Profile/Account Settings
• Purpose: Allow users to update personal details, change passwords, and review subscription/billing information.
• Key Components:
 – Form fields for personal information (name, email, etc.)
 – Password management options (change password, multi-factor authentication settings)
 – Billing history and subscription details (if integrated)
• Flow:
 – Accessible via a profile icon in the header.
 – Changes are then saved and updated in real time.
──────────────────────────────
OVERALL USER FLOW DIAGRAM (Summary)
1. Landing Page for Saas Company (Page 1)
 ↓
2. Dashboard Home (Page 2)
  • Includes navigation links and a brief overview.
 ↓
2A. Performance Metrics 
  • Dedicated page to display key performance statistics (total records, processed extractions, time/cost savings, language preferences).
 ↓
3. Document Upload (Page 3)
 ↓
4. Processing (Page 4 – loading state)
 ↓
5. Document Review & Verification (Page 5 – two-pane layout)
  • Option to edit inline, set confidence filter, then confirm.
 ↓
6. Document History (Page 6)
 ↓
7. Profile/Account Settings (Page 7)
