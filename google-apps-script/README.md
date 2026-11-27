# Connect training registration

## Google account and web app

1. Sign in with an account that can edit the target sheet. Open https://docs.google.com/spreadsheets/d/1wl5FXLawJoJLh81PQDXhWhUcEJOW5tM30qyVb3OOuYQ/edit#gid=0 . Under Share, keep General access set to Restricted. Visitors only call the write endpoint.
2. In the spreadsheet choose Extensions > Apps Script. In a new script project copy Code.gs from this directory into the script editor and save. If an existing script already handles this sheet, create a separate project at script.google.com instead of replacing existing code. Use a single deployed writer for this form.
3. Beside Services click +, choose Google Sheets API (v4), and add it with identifier Sheets. For a standard Google Cloud project also enable Google Sheets API under APIs & Services in the linked Cloud project. The default Apps Script Cloud project enables it when you add the service.
4. Choose Deploy > New deployment > Select type > Web app. Set Execute as to Me and Who has access to Anyone (including signed-out visitors). Click Deploy, review permissions and authorize spreadsheet access as the editor. Copy the Web app URL ending in /exec. If your Workspace administrator disallows anonymous web apps, the admin must permit public endpoint access or an alternative server must be deployed. Keep the sheet itself restricted.
5. A blank tab with numeric ID 0 gets headings with its first successful registration. On a populated tab the writer maps the following exact column names in row 1, in any order. Add missing column labels in unused columns or rename matching headings yourself before enabling the form. Existing rows are preserved.

   Submitted at (IST) | Name | Phone | Email | Training (days) | Fee (INR) | Registration ID

The deployment URL is public and grants the ability to submit. The web app exposes no sheet-reading endpoint. App Script quotas apply. For script updates use Deploy > Manage deployments > Edit > New version so the URL stays the same.

## Deploy the frontend

1. On GitHub open Nireekshithkumar/Blueshell > Settings > Secrets and variables > Actions > Variables > New repository variable. Name it VITE_REGISTRATION_ENDPOINT and paste the /exec URL as its value.
2. Under Settings > Pages > Build and deployment > Source select GitHub Actions.
3. Under Actions choose Deploy BlueShells to Pages > Run workflow > main > Run workflow. Open the github-pages environment URL after the run succeeds. Repeat this build when the endpoint changes.
4. For local development set VITE_REGISTRATION_ENDPOINT in .env.local and restart Vite. On another static host set the same build variable, run npm run build and publish dist. Only the endpoint URL belongs in Vite variables.

## Verify one registration

Open the deployed site in a signed-out/private browser. Select the 7-day plan. Use a recognizable test name, a test phone starting with +91 and an email address you control. Click Submit twice quickly. Wait for the saved message, then open tab 0 as the owner. Confirm exactly one new row, the entered phone with +91, 7 days, numeric fee 5000, an India-time timestamp and a registration ID. The 15- and 30-day plans use 10000 and 20000 respectively.

To exercise recovery with the same test, switch the browser offline before the first submission. Confirm the error and retained entries, go online, then submit. Identical retries within the tab reuse the same receipt, including after a refresh if session storage is available. A separate browser session can intentionally submit a new registration. No response, HTML sign-in page, or unmatched receipt counts as success.

If the browser reports a network/CORS error, verify anonymous access, the /exec URL, and that the latest web-app version is deployed. Check Apps Script > Executions, the enabled Sheets service, tab ID and header spelling. The frontend uses a simple POST and follows Google's response redirect.

Google documentation: [Web apps](https://developers.google.com/apps-script/guides/web), [Advanced services](https://developers.google.com/apps-script/guides/services/advanced), [Content Service redirects](https://developers.google.com/apps-script/guides/content).
