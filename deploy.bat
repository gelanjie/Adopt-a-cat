@echo off
REM ---- Google Cloud Storage static site deploy ----
REM 1) Install gcloud CLI: https://cloud.google.com/sdk/docs/install
REM 2) Run: gcloud auth login
REM 3) Edit BUCKET and PROJECT below, then run this file.

set BUCKET=your-bucket-name
set PROJECT=your-project-id

gcloud config set project %PROJECT%

REM Create the bucket (pick a globally unique name)
gsutil mb -p %PROJECT% gs://%BUCKET%

REM Upload site files
gsutil -m cp index.html admin.html app.js admin.js style.css gs://%BUCKET%/
gsutil -m cp -r images gs://%BUCKET%/

REM Make the bucket publicly readable
gsutil iam ch allUsers:roles/storage.objectViewer gs://%BUCKET%

REM Set index and 404 pages
gsutil web set -m index.html -e index.html gs://%BUCKET%

echo.
echo Deploy done. Visit: https://storage.googleapis.com/%BUCKET%/
pause
