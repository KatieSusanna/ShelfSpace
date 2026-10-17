# Virtual Library: first 3D slice

This starter scene contains only a room, keyboard and mouse movement, and two bookcases. The walls are simple placeholders, while the shelves and books come from your wooden bookcase archive.

## Run it

From this project folder, run:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Click inside the scene to capture the mouse. Move with **W A S D**, hold **Shift** to walk faster, and press **Esc** to release the mouse. Clicking the scene again captures it again.

## Bookcase model and covers

The app now uses the FBX from your archive. The tall and small bookcases are separate named parts of that scene. The model and its optimized textures are in `public/models/`; if loading fails, a simple wooden shelf appears instead.

The untouched model and full-resolution textures are kept under `assets/bookcase/`. The smaller files in `public/models/` are the copies the browser actually loads. The loader also fixes the filename difference between the FBX and texture files, so the original filenames can stay unchanged.

The two bookcases are placed in `src/config/layout.ts`. Their `position` values are in metres as `[x, y, z]`. `rotation` is in radians, and `scale` can be one number or three numbers (`[x, y, z]`). For example, turn a bookcase by 90 degrees with `rotation: [0, Math.PI / 2, 0]`. If a model appears too large or small, adjust its scale; if it faces the wrong way, adjust its rotation; if it is in the wrong place, adjust its position. The matching collision footprints are calculated from these settings.

The FBX has book-named parts, but each is a merged group rather than individual books. The loader hides only objects named `*_Books_*`; the actual `Victorian_Bookcase_*` shelf mesh stays visible. It logs the loaded names, parents, bounds, positions, and visibility to the browser console. The tall bookcase is scaled to about 2.2 m high and sits on the floor.

The archive book asset is extracted to `public/models/sm-books/`. It contains three books joined into a single mesh, so `src/components/scene/Book.tsx` separates the mesh into three reusable book shapes. Each shape is placed into an individual slot, scaled to that slot's measured width, given one of twelve leather colours, and overlaid with a generated title and author label on its spine. There are seven sample books per shelf row. The shelf row heights and spacing are in `src/config/books.ts`.

Press **B** to show wireframe boxes around each book slot. Slot heights are based on the shelf plank tops. They are approximate, so use the debug boxes to adjust spacing if you move or replace the model.

## Picking a book and writing a review

Aim the screen-centre crosshair at one of the separate placeholder books. It highlights when it is within about 3 metres. Click to pull it toward you and open its review panel. Set a star rating to enable Save; reviews are stored in this browser's local storage. Close returns the book to its shelf. For the simpler instant-hide interaction, set `ANIMATE_BOOK` to `false` in `src/config/interaction.ts`.

The titles and authors are sample data in `src/config/books.ts`. The source asset provides the book surface detail; the colour palette is in `src/components/scene/Book.tsx`. Adjust the row heights, row counts, and slot widths in `src/config/books.ts` if you move or scale the shelf.

## Project map

- `src/app/page.tsx` creates the full-screen 3D canvas.
- `src/components/scene/Room.tsx` draws the floor, walls, ceiling, and places bookcases.
- `src/components/scene/Lighting.tsx` adds warm lights that gently flicker.
- `src/components/scene/Player.tsx` handles pointer lock and WASD movement.
- `src/components/Bookcase.tsx` loads the FBX, hides only merged book groups, and draws a fallback shelf if loading fails.
- `src/components/scene/Book.tsx` splits and places the textured book asset.
- `src/config/layout.ts` keeps room size, bookcase transforms, and collision footprints together.
- `src/config/books.ts` contains measured shelf rows and the generated book slots.
- `src/lib/useBookSelection.ts` handles centre-screen raycasting and the take/return animation.
- `src/components/ui/ReviewPanel.tsx` displays the review form; `src/store/reviews.ts` saves it locally.

## What is included

- Working: the room, ambient fog and lights, mouse look, WASD and Shift movement, room boundaries, shelf collision, model inspection logs, selectable procedural books, review panel, and locally saved ratings/reviews.
- Placeholder: book titles, authors, and exact slot positions are sample data. The smaller bookcase is kept as a shelf but is currently empty. No scanning or metadata lookup is included yet. The supplied asset uses a shared texture atlas, so its cover pattern repeats across all books; colour variation is applied as a tint.

The old FBX book meshes use a shared texture atlas and are not individual objects, which is why the app uses the new separate books for selection. Camera controls require a laptop or desktop mouse and keyboard.
