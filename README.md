# Adopt a Cat - Cat Adoption Platform

A modern, responsive web application for browsing and adopting cats, featuring a customer portal and an admin dashboard. Built with HTML, CSS, and Vanilla JavaScript, powered by MantleDB for cloud data storage.

## Features

### Customer Portal (`index.html`)
*   **Browse Cats:** View available cats in a grid.
*   **Filtering:** Filter cats by type, colour, age, and gender.
*   **Adoption Requests:** Submit requests to adopt a cat.
*   **My Requests:** Track the status of submitted requests.
*   **Donation & Virtual Pet:** Support the shelter by caring for a virtual pet.
*   **User Accounts:** Register and log in to submit requests and donations.

### Admin Dashboard (`admin.html`)
*   **Dashboard Overview:** View key statistics (requests, users, cats, donations).
*   **Manage Cats:** Add new cats (with photos), edit existing cat details and introductions, and remove cats.
*   **Manage Requests:** View all adoption requests, mark them as "Sent", or cancel them.
*   **Manage Donations:** View and remove donation records.
*   **Manage Users:** View registered users.

## Tech Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Backend / Database:** MantleDB (Cloud NoSQL API)

## Setup & Deployment

This is a static web application, so deployment is straightforward.

1.  **Static Hosting:** The application files (`index.html`, `admin.html`, `app.js`, `admin.js`, `style.css`, `images/`) can be hosted on any static site hosting service:
    *   **GitHub Pages:** Upload files to a repository and enable Pages.
    *   **Netlify Drop:** Drag and drop the project folder.
    *   **Google Cloud Storage:** Use the included `deploy.bat` script (requires Google Cloud CLI) or upload via the Google Cloud Console.

2.  **MantleDB Configuration:** The application connects to MantleDB using the namespace (`NS`) and key (`KEY`) defined in `app.js` and `admin.js`. These are currently set to a demo environment. For production, you should use your own MantleDB namespace and key.

## Admin Access

To access the admin dashboard, navigate to `admin.html`.

*   **Default Password:** `admin`

## Project Structure

*   `index.html`: Customer portal (home, catalog, requests, donation, about).
*   `admin.html`: Admin dashboard login and interface.
*   `app.js`: Main JavaScript logic for the customer portal.
*   `admin.js`: JavaScript logic for the admin dashboard.
*   `style.css`: Global styles for both portals.
*   `images/`: Contains cat images and assets.
*   `deploy.bat`: Deployment script for Google Cloud Storage.
