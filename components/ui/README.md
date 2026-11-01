# Glass Folder Cards

A folder you can use, drawn as a physical object. It has three layers: a back panel holding a piece of
artwork, the files inside, and a frosted-glass front panel that blurs whatever sits
behind it. The files are real elements between real panels, so the glass frosts
them as they move.

```
http://localhost:5173/#glass-folder-cards          # milk glass, archive with a menu, smoked glass
http://localhost:5173/#glass-folder-cards/custom   # custom palettes, every preset, sizes, controlled open
http://localhost:5173/?dark#glass-folder-cards     # the dark check
```

No dependencies beyond React. No images, fonts or CSS file to ship.

## Interaction

| State | What happens |
|---|---|
| **Appear** | The first time the folder scrolls into view, it assembles itself: the back panel settles, the files drop into the pocket one after another, then the glass slides up in front. `appearDelay` staggers a row of folders. |
| **Rest** | Flat and closed. The artwork bleeds through the top of the frost, and on a full folder the top of the last file shows over the pocket's edge. |
| **Hover / focus** | The glass leans toward you on its bottom hinge and the files lift a little out of the pocket. The light on the glass and the parallax on the artwork follow the pointer, and the whole folder tilts a few degrees with it. |
| **Open** (click, Enter, Space) | The glass falls further forward, and the files rise and fan out, each one a button (or a link, with `href`) showing its name and meta. Hovering a file lifts it clear of the others. Close it with a second click, Escape, or a click anywhere outside. |
| **`+`** | A new file drops in from above and lands in the pocket, the glass flexes under it, and the count rolls over. |
| **`···`** | A frosted menu opens above the key. Open / Close is always its first item. Arrow keys, Home / End and Escape all work, and focus returns to the key when the menu closes. |

Closed files are `inert`, so Tab never lands on something you can't see. When the folder is open, Tab goes from the folder to its files and then to the key. `prefers-reduced-motion` turns off the entrance, the tilt and every transition.

## Artwork

The back panel and any picture-type file are generated, not fetched. A domain-warped noise field
is folded into itself twice, then shaded as if it were the surface of a liquid. Its slope gives a normal, the normal gives
diffuse light and a tight specular highlight, and fine striations follow the
contours like combed ink. `streak` stretches the same field along one axis first, so it reads
as a long exposure.

Painting runs in a shared queue that spends about 7 ms a frame, back panels first.
Each recipe and seed is painted once and reused by every folder that asks for it. The
canvas fades in from a blur when it's ready.

| Preset | Look |
|---|---|
| `aurora` | blush, oxblood and steel pulled into a long exposure (`streak`) |
| `ember` | red ink folding through teal-black water |
| `dusk` | plum and rust, swirled |
| `glacier` | cold and pale, nearly white (`streak`) |
| `verdant` | moss and brass |

Or bring your own palette:

```tsx
<GlassFolder
  label="Lagoon"
  art={{ style: "marble", colors: ["#04121a", "#0b3a4a", "#1f8a8a", "#0a1c22", "#7fd6c2", "#e8fff6"], warp: 3.4 }}
  seed={4}
/>
```

`seed` gives another arrangement of the same recipe. `image` swaps the art for a picture of your
own. `art="none"` gives a plain frosted back, like the archive in the demo.

## Props

| Prop | Default | Notes |
|---|---|---|
| `label` | `"My Files"` | |
| `meta` | file count | The second line, set in monospace. Without `meta`, the line shows the file count and rolls when you add one. |
| `tone` | `"light"` | `light` is milk glass, `dark` is smoked glass. |
| `art` | `"aurora"` | A preset, an `ArtRecipe`, or `"none"`. |
| `seed` | `3` | |
| `image` | none | A URL for the back panel. Overrides `art`. |
| `files` | 3 samples | `{ name, meta?, art?, image?, href? }[]`. A file with `art` or `image` is drawn as a picture, and one without is a sheet of paper. The folder reads this list once and keeps its own copy after that. |
| `action` | `"add"` | `add`, `more` or `none`. |
| `onAdd` | none | `(files) => FolderFile \| void`. Returns what drops in. Without it, an "Untitled" sheet drops in. |
| `onFilesChange` | none | Called with the new list after each add. |
| `menu` | `[]` | `{ label, onSelect?, danger? }[]` for the `···` key. |
| `labelPlacement` | `"bottom-left"` | `bottom-left`, `top-left` or `top-right`. |
| `open` / `defaultOpen` / `onOpenChange` | uncontrolled | Use these to control the folder from outside. |
| `onFileSelect` | none | `(file, index)`. Called when someone picks a file in the open folder. |
| `width` | `340` | In px. Everything scales with it, and the height is `0.96 × width`, which includes headroom for the files to rise into. 280 px or wider keeps the second line easy to read. |
| `appear` / `appearDelay` | `true` / `0` | The entrance, and its delay in ms. |

## Sizing notes

The root is `inline-block` with a definite pixel size, and nothing inside it uses
percentage heights, so it renders the same in a page with no `html/body` height chain.
When the folder is open, the files fan above the reserved headroom and slightly past the sides
(`overflow: visible`), so leave some space around it.

The glass relies on `backdrop-filter` with `clip-path: path()`. Both are supported in
every current browser.
