# Chrome Web Store submission notes — VizLens v1

## Single purpose

**VizLens helps users inspect analytical visuals and article evidence on the current page they explicitly invoke it on, recover grounded data locally, and export visual-research handoffs.**

Visual discovery, article evidence, recovered data, VizForge JSON and Power BI role handoffs are outputs of that same visual-research purpose.

## Permission justifications

### `activeTab`
Temporary page access after the user invokes VizLens. This avoids persistent blanket browsing access.

### `scripting`
Runs the packaged deterministic scanner in the explicitly activated tab.

### `sidePanel`
Provides the research UI beside the page being inspected.

### Optional `http://127.0.0.1/*`
Requested only when the user explicitly enables optional Gemini features after the AI data disclosure. It lets the extension contact the user-run local companion. Deterministic scanning does not require this permission.

## User-data disclosure

Page scanning is local. On explicit Gemini actions only, bounded article/document evidence or a resized viewport image may be sent through the user's localhost companion to Google Gemini. The current page URL is not included in the Gemini prompt. The extension does not collect the user's API key.

## Remote hosted code

**No.** All executable extension logic is packaged in the MV3 submission. The localhost companion and Google Gemini perform data-processing/server operations; the extension does not download or execute remote JavaScript, WebAssembly, commands, or interpreters.

## Sale/advertising

VizLens does not sell user data, use user data for personalized advertising, or transfer browsing data to data brokers.

## Reviewer test path

1. Install extension.
2. Open a normal article containing a chart/table.
3. Invoke VizLens and click `Scan page`.
4. Verify Visuals/Article/Data work without the companion.
5. Open Gemini tab: the passive disclosure explains optional AI transfer.
6. Click a Gemini action: the consent dialog appears and localhost permission is requested only after acceptance.
7. Cancel: deterministic functionality continues to work.
