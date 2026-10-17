# Runtime bookcase files

The app loads `bookcase.fbx` from this folder. Its two mesh roots are selected by name in `src/components/Bookcase.tsx`:

- `Victorian_Bookcase_Tall`
- `Victorian_Bookcase_Small`

The FBX stores texture paths with spaces, while the ZIP's texture filenames use underscores. The loader maps those names to the optimized browser-ready copies in `bookcase/textures/`. The untouched originals are stored in `assets/bookcase/textures/`.

Book cover textures used by the generated books are grouped in `sm-books/textures/`. The original Leather033A material and maps are kept in `assets/books/source/Leather033A/`.
