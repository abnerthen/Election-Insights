# Election Insights - Interactive Election Results Dashboard

An elegant, real-time, interactive election results visualization platform designed as a modern web application. It features a public-facing dashboard with rich aesthetics (parliamentary hemicycles, turnout gauges, dynamic maps, regional rows, and slimmest majority reports), sourced live from the [ElectionData.MY](https://electiondata.my) public API — no database required.

---

## 🚀 Key Features

### Public Dashboard
* **Dynamic Hemicycle Diagram**: Responsive seating layout representing the distribution of seats won by each party. Excludes undeclared seats from coloring (shown as grey) to ensure real-time reporting integrity.
* **Smart Stat Cards**:
  * **Seats Declared**: Interactive progress ratio showing reporting progress.
  * **Turnout**: Speedometer gauge showing voter turnout percentages and absolute counts.
  * **Slimmest Majority / Contested Seats**: Live card showing details of the seat with the slimmest majority (winner, margin, and vote shares of all candidates). Automatically falls back to a **Seats Contested** ratio list (sorted descending) if no results have been declared yet.
  * **Projected Winner**: High-impact projected leading party with seat margins.
* **Constituency Grid View**: Center-aligned grid visualization mapping regional constituency layouts. Employs a dynamic crop bounding-box algorithm to automatically trim outer empty margin space for perfect alignment.
* **Vote Share Analysis**: Horizontal progress bar charts with high-contrast text overlay (utilizing CSS `mix-blend-mode: difference` and `isolation: isolate` to invert character colors dynamically depending on the background, solving visibility on light backgrounds).
* **Auto-Polling**: React Query handles automatic background updates of all live statistics every 5 seconds.

---

## 🛠 Tech Stack

### Frontend Client
* **Framework**: React 19 (TypeScript)
* **Build Tool**: Vite 7
* **Styles**: Tailwind CSS
* **State & Data Fetching**: TanStack React Query v5 (polling base)
* **Routing**: Wouter
* **Icons**: Lucide React

### Backend API Server
* **Server**: Node.js & Express
* **Data source**: Proxies and reshapes the [ElectionData.MY API](https://electiondata.my/openapi) — holds the API key server-side, never exposed to the browser
* **Logging**: Pino Logger
* **API Spec**: OpenAPI 3.0 with Orval automatic client hook generation

---

## 💻 Local Setup & Installation

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **pnpm** package manager (enforced in `package.json`)
* A free ElectionData.MY API key — generate one from their [API Console](https://electiondata.my/console)

### Step 1: Clone and Install Dependencies
Navigate to the root directory and install packages:
```bash
pnpm install
```

### Step 2: Run the Development Servers
Open two terminal windows in the workspace root:

* **Terminal 1: Start the API backend server**
  ```bash
  ELECTION_DATA_API_KEY="your-electiondata-my-key" PORT=5005 npx pnpm --filter @workspace/api-server run dev
  ```
* **Terminal 2: Start the frontend dashboard app**
  ```bash
  API_PORT=5005 PORT=3000 BASE_PATH=/ npx pnpm --filter @workspace/election-results run dev
  ```

Once running, navigate to:
* **Public Dashboard**: `http://localhost:3000`

---

## 🔮 Future Enhancements & Extra Features

Below are recommended roadmap features that would elevate the project's capabilities:

1. **Real-time WebSockets / SSE**: Replace the 5-second polling system with a real-time WebSocket connection (or Server-Sent Events) for instant updates on election night.
2. **Interactive Geographical Map (GeoJSON)**: Integrate a geographic visualization layer using SVG/Leaflet with GeoJSON data from ElectionData.MY's open data lake to allow users to hover over and click actual colored constituency boundaries on a physical map.
3. **Historic Comparison & Swing Trends**: Use ElectionData.MY's full historical catalogue (1955–present) to calculate and visualize vote swings, seat changes, and gain/loss shifts for each party between elections.
4. **Detailed Swing Analytics Charting**: Introduce stacked area charts showing turnout time-series data or margins over time to track election-day reporting trends.

## License

This project is licensed under the terms of the MIT license.

## Rights

Rights to all the data in the public facing website (https://election-results-website.vercel.app) belong to their respective rightsholders (TindakMalaysia.org, ElectionData.MY, Election Commission of Malaysia, Attorney-General's Chambers of Malaysia).
