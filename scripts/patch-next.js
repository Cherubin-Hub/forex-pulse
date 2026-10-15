/**
 * Hotfix script for Next.js 16.3.8 Turbopack development key warning in OuterLayoutRouter.
 *
 * Issue: Next.js dev server injects an unkeyed React.Fragment for devtools `segmentViewBoundaries`
 * into `OuterLayoutRouter`'s `SegmentStateProvider` [child, segmentViewBoundaries], which causes
 * React 19 reconciler to emit:
 * "Each child in a list should have a unique 'key' prop. Check the render method of OuterLayoutRouter."
 *
 * This script assigns an explicit key (`segment-view-boundaries`) to prevent the warning.
 */

const fs = require('fs');
const path = require('path');

const targets = [
  {
    file: path.join(__dirname, '../node_modules/next/dist/server/app-render/create-component-tree.js'),
    from: 'const segmentViewBoundaries = isSegmentViewEnabled ? createElement(Fragment, null,',
    to: 'const segmentViewBoundaries = isSegmentViewEnabled ? createElement(Fragment, { key: "segment-view-boundaries" },',
  },
  {
    file: path.join(__dirname, '../node_modules/next/dist/esm/server/app-render/create-component-tree.js'),
    from: 'const segmentViewBoundaries = isSegmentViewEnabled ? createElement(Fragment, null,',
    to: 'const segmentViewBoundaries = isSegmentViewEnabled ? createElement(Fragment, { key: "segment-view-boundaries" },',
  },
];

let patchedCount = 0;

for (const target of targets) {
  if (fs.existsSync(target.file)) {
    let content = fs.readFileSync(target.file, 'utf8');
    if (content.includes(target.from)) {
      content = content.replace(target.from, target.to);
      fs.writeFileSync(target.file, content, 'utf8');
      console.log(`[patch-next] Successfully patched: ${path.relative(process.cwd(), target.file)}`);
      patchedCount++;
    } else if (content.includes(target.to)) {
      console.log(`[patch-next] Already patched: ${path.relative(process.cwd(), target.file)}`);
      patchedCount++;
    } else {
      console.warn(`[patch-next] Target pattern not found in: ${target.file}`);
    }
  }
}

console.log(`[patch-next] Complete. Total files verified/patched: ${patchedCount}/${targets.length}`);
