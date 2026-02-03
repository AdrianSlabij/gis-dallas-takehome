# Dallas Parcel Visualizer

A full-stack geospatial application that allows users to explore real estate parcels in the Dallas-Fort Worth area. This project was built to demonstrate secure authentication, interactive map rendering, and role-based data access.

## Live Demo

* **Frontend (Vercel):** [https://gis-dallas-takehome-frontend.vercel.app](https://gis-dallas-takehome-frontend.vercel.app/)
* **Backend (Render):** [https://gis-dallas-takehome-backend.onrender.com/docs](https://gis-dallas-takehome-backend.onrender.com/docs#/)

---

## Features Implemented

* **Secure Access:** AWS Cognito authentication for secure user management.
* **Role-Based Visibility:**
    * **Guests:** Restricted to Dallas County (max 200 records).
    * **Registered Users:** Access to all counties (max 600 records).
* **Interactive Map:** High-performance rendering of parcel polygons using Mapbox.
* **Persistence:** Filters (Price, SqFt) are saved automatically so users don't lose their settings.
* **Data Export:** Filtered results can be exported to CSV.

## Tech Stack

* **Frontend:** React (Vite), TypeScript, Mapbox
* **Backend:** Python FastAPI, Docker
* **Database:** PostgreSQL with PostGIS
* **Auth:** AWS Cognito (JWT Verification)
