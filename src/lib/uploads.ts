// The URL of a file the CMS uploaded. Content writes uploads root-relative
// (`/uploads/x.png`, public_folder in static/admin/config.yml), without the base path;
// asset() adds it (/cms-test on GitHub Pages, nothing in dev). Kit 3's asset() takes
// the path without its leading slash. The cast: AssetPath only knows the files static/
// had at build time, and the live preview shows uploads the build has never seen.
import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';

export const uploadUrl = (path: string) => asset(path.replace(/^\//, '') as AssetPath);
