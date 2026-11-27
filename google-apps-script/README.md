# BlueShells registration on Vercel

The form posts to /api/register on the same origin. The function calls Google Apps Script on the server. Visitors never receive the Google authorization, shared secret or script URL. The separate Contact BlueShells footer link opens email.

## Google setup

1. Open [the spreadsheet, tab 0](https://docs.google.com/spreadsheets/d/1wl5FXLawJoJLh81PQDXhWhUcEJOW5tM30qyVb3OOuYQ/edit#gid=0) as an editor. Keep **Share > General access > Restricted**. To check older attempts, search this tab for the submitted email, programme and approximate time before testing again.
2. Open **Extensions > Apps Script**. Replace the previous BlueShells writer with [Code.gs](Code.gs) in its existing project, or create a new project if installing for the first time. Save. Under **Services > +** add **Google Sheets API**, v4, identifier **Sheets**. For a standard Google Cloud project also enable the Google Sheets API in that project's API Library.
3. In **Project Settings > Script properties** add **REGISTRATION_SHARED_SECRET**. Generate a random 32-byte or longer value using a password manager and keep it for Vercel. The default notification recipient is blueshells.team@gmail.com from the original registration form. To override it privately, add **REGISTRATION_RECIPIENT** here. Never put either value in Vite variables.
4. In the editor select **checkRegistrationSetup > Run** and authorize spreadsheet access and sending email as the client's chosen Google account. The check looks up the sheet and mail quota without writing a row or sending a message.
5. For an existing deployment, use **Deploy > Manage deployments > Edit > New version > Deploy**. For a new one use **Deploy > New deployment > Web app**. Choose **Execute as: Me**, **Who has access: Anyone**, then copy the web app URL ending in **/exec**. Requests must also pass the server-side secret. If the organization blocks anonymous web apps, ask its administrator to allow this setup. Retire previous unauthenticated BlueShells deployments if still active.
6. Choose **Triggers > Add Trigger**. Select **retryClientNotifications**, deployment **Head**, event source **Time-driven**, **Minutes timer**, **Every 10 minutes**, then save. This retries pending and failed notifications in batches of ten without inserting registrations. The editor can also run the function on demand.

## Vercel setup

1. Use the existing Vercel project linked to Nireekshithkumar/Blueshell. Set its root directory to the repository root and use the Vite preset, build command npm run build and output directory dist. The root api/register.js is a Node.js Vercel Function.
2. In Settings > Environment Variables set REGISTRATION_SCRIPT_URL to the existing Apps Script /exec URL and REGISTRATION_SHARED_SECRET to the exact value from Script properties. Select Production, and Preview if testing a preview deployment. Keep both server-only.
3. Deploy main and confirm the deployment is Ready. Redeploy after changing variables. Use vercel dev for local API integration; standalone Vite serves only the frontend. If the Google writer already matches Code.gs, retain its existing deployment.

## Sheet and notification behavior

* A blank tab receives Submitted at (IST), Name, Phone, Email, Training (days), Fee (INR), Registration ID and Client email status. On an existing tab the first seven labels must exist exactly once in row 1, in any order. If needed, map your existing headings before enabling intake. The script adds only the status column to a compatible legacy tab.
* Phones and other user text are written as RAW strings. Fees are derived server-side. A script lock and stored receipt guard browser retries. A receipt is reused for the same fields within the same browser tab. A new session may submit a new registration.
* After a committed row, a mail error leaves the registration successful and records Failed. Fix the recipient, access or quota, then run retryClientNotifications. **Sent** means Google accepted the dispatch; check inbox and spam for delivery. Historical rows with blank status are left alone. To notify about an existing verified registration, mark its Client email status Pending and run the retry function.
* **Sending** after an interrupted execution is ambiguous since email and Sheets cannot commit atomically. Check Apps Script Executions and the client's inbox for the registration ID before marking that row Sent or Pending. Automatic retries skip Sending to avoid a duplicate email.
* Export from **File > Download > Microsoft Excel (.xlsx)** in Google Sheets.

## Verify one deployment

In a private browser window visit the production Vercel site at /#training. Select the 7-day plan, enter a unique test name, an email you control and a phone starting with +91. Click Submit twice quickly. Confirm **Registration successful**, one new row with the exact phone, 7, 5000, an IST timestamp and a registration ID, and one email in the client's inbox containing that ID. No visit to Gmail is required for the registrant.

For diagnosis, browser Network should show POST /api/register and JSON with ok: true and a matching id on success. No POST plus Missing deployment URL indicates the old bundle. A 404 suggests the function wasn't deployed, 503 configuration means a missing/invalid Vercel setting, and 502 requires checking Google deployment access, secret, headings or Apps Script Executions. Reuse the same form on an uncertain result.

Local checks: node --test tests/registration.test.mjs and npm run build.

[Vercel environment variables](https://vercel.com/docs/environment-variables) | [Apps Script web apps](https://developers.google.com/apps-script/guides/web) | [Google MailApp](https://developers.google.com/apps-script/reference/mail/mail-app)
