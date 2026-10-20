# The Midnight Stacks

**A walkable, interactive library for discovering and cataloguing books.** The Midnight Stacks pairs a detailed 3D reading room with tools for identifying books, viewing their details, and keeping personal ratings and reviews. Built during a 24-hour hackathon.

## Features

- Explore a gothic library rendered in 3D, with perimeter bookcases, a fireplace, a window seat, lounge seating, and atmospheric lighting.
- Walk through the room with first-person controls, pick books from shelves, inspect them, and return them to their places.
- Add a book by scanning its ISBN-13 barcode or taking a photo of its cover.
- Look up book information through Open Library. Cover recognition uses Gemini to read the cover before retrieving matching catalogue details.
- View scanned titles, authors, publication dates, descriptions, page counts, and cover art where catalogue data is available.
- Rate books and write reviews, which are saved in the browser's local storage.
- Persist scanned book metadata in `books.csv` through the app's local API.

## Technology

- **Application:** Next.js 14, React 18, TypeScript
- **3D:** Three.js, React Three Fiber, Drei, and postprocessing
- **Interaction and state:** Zustand and GSAP
- **Scanning:** `html5-qrcode` for ISBN barcodes; camera capture and Gemini for cover recognition
- **Book catalogue:** Open Library APIs
- **Assets:** Custom room composition, 3D models, and texture maps in `public/` and `assets/`

## Prerequisites

- Node.js 18.17 or later and npm
- Git and Git LFS to clone the repository with its video demo
- A modern browser with WebGL support
- Camera permission for barcode and cover scanning. Camera access requires `localhost` or HTTPS.
- A Gemini API key for the **Use cover photo** recognition flow. Barcode lookup works without this key.

## Run locally

1. Clone the repository and fetch the LFS demo asset:

   ```bash
   git lfs install
   git clone https://github.com/KatieSusanna/The-Midnight-Stacks.git
   cd The-Midnight-Stacks
   git lfs pull
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. (Optional) Configure Gemini cover recognition by creating a `.env.local` file in the project root:

   ```dotenv
   GEMINI_API_KEY=your_gemini_api_key
   ```

   Keep this key private and do not commit it. Without it, barcode scanning and the rest of the application remain available.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

For a production build, run `npm run build`, then `npm start` to serve it.

## Controls

| Action | Control |
| --- | --- |
| Enter the library and capture the mouse | Click the scene |
| Look around | Move the mouse |
| Walk | **W**, **A**, **S**, **D** |
| Move faster | Hold **Shift** |
| Release the mouse | **Esc** |
| Pick up or inspect an aimed-at book | Left-click |
| Return a held book | Right-click |
| Scan the held book | Press **B** |

## Project structure

```text
src/
  app/                 Next.js pages, styles, and API routes
  components/          3D scene, book interactions, scanner, and reading UI
  config/              Room layout, interaction settings, and shelf inventory
  lib/                 Book selection and metadata helpers
  store/               Client-side book metadata and review state
assets/                Source models, textures, and references
public/models/         Runtime models and textures loaded by the browser
books.csv              Saved book catalogue data
The_Midnight_Stacks_Demo.mp4  Video demo (Git LFS)
```

## Data and integrations

- Book metadata is retrieved from [Open Library](https://openlibrary.org/). Results depend on catalogue coverage and may be incomplete.
- Cover recognition sends the captured cover image to the configured Gemini API, then uses Open Library for catalogue details.
- Scanned book records are read from and written to `books.csv` by the Next.js API. This requires a writable project directory and is intended for local or single-instance use.
- Ratings and review text are stored in the current browser's local storage; they are not synchronized between browsers or devices.
- Book titles and shelf contents are configured in `src/config/books.ts` and `books.csv`.

## Project owners

1. **Shreya Jagannatha**
2. **Katie Griffiths** ([KatieSusanna](https://github.com/KatieSusanna))
3. **Elizabeth Avis**

## License and asset credits

No project-wide license is currently specified. Third-party models and textures retain their source terms; see the README files under `assets/` and `public/models/` for asset notes.
