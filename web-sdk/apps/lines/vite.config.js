// @ts-ignore
import config from 'config-vite';

import pkg from './package.json' with { type: 'json' };

const base = config();

export default {
	...base,
	define: {
		...(base.define ?? {}),
		// surfaced in the UI via <GameVersion /> — single source of truth is
		// package.json, never a hardcoded string
		__APP_VERSION__: JSON.stringify(pkg.version),
	},
};
