# ShelfSpace

A navigable gothic library scene built with Next.js and React Three Fiber. The room is 8 m wide, 9 m deep, and 3.2 m high. It uses the current bookcase, book, and fireplace models, with the fireplace centered on the north wall, filled shelves around the perimeter, a window and window seat on the east side, and the entrance behind the starting position.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click the scene to capture the mouse, look around with the mouse, move with **W A S D**, hold **Shift** to move faster, and press **Esc** to release the mouse. Aim at a book and click to open its review panel. Press **B** to show book placement boxes.

## Assets and layout

- `src/config/layout.ts` defines the room, fireplace, window seat, shelf positions, and collision bounds.
- `src/config/books.ts` fills every tall and low shelf with generated books.
- `src/components/scene/Room.tsx` builds the room shell, entrance, east window, lounge area, and assembled scene.
- `src/components/scene/Fireplace.tsx` loads the fireplace model and its runtime maps.
- `assets/bookcase/` and `assets/fireplace/` preserve source models and textures.
- `public/models/` contains the browser-loaded models and textures.

Book reviews are saved in this browser's local storage. Titles and authors are sample data.
