# Legacy level data

The checked-in runtime catalogue is `public/data/levels.json`. It is versioned (`schemaVersion: 1`) and contains 406 levels with stable piece IDs, initial coordinates, dimensions, movement axes, difficulty, minimum steps, and localized names (`zh-CN`, `zh-Hant`, `en`). The app will use this generated JSON as its runtime catalogue. At this data-migration stage, Vite copies it as a static asset; the build never reads the old XML or runs the converter.

Legacy movement follows the original implementation: every piece can slide along either axis when its path is clear. Width and height describe its footprint, not its allowed movement axes.

## Regenerate locally

Keep the old project copy in the ignored `reference/` directory. From the repository root, provide both paths explicitly:

```sh
npm run import:levels -- --input reference/HRD/HRD/HRD/AllLevels.xml --output public/data/levels.json --mapping-output docs/legacy-level-mapping.json
```

`--mapping-output` is optional. When supplied, it writes a separate archival table from each runtime `levelId` to the original `LevelInitialID` (`sourceId`) and exact source title (`sourceName`). These legacy IDs and titles are not part of runtime level objects.

The importer needs Node.js 22.6 or newer for Node's built-in TypeScript stripping. Simplified titles are normalized from the source with OpenCC, Traditional titles are generated from those names with OpenCC's Taiwan phrase dictionary, and the curated English translations live in `scripts/level-titles.en.json`, keyed by runtime level ID. Review and update those translations when the source catalogue changes.

The importer validates the 406-level count, runtime and source ID uniqueness, difficulty range and historical distribution, positive integer `MinSteps`, piece triples and known piece types, the single 2×2 Cao Cao target, board bounds, and occupied-cell collisions. Any issue reports its level and field and stops before writing output. Successful output files are staged and renamed into place.

Never commit the `reference/` XML; only the generated runtime catalogue, optional provenance mapping, and importer sources belong in Git.