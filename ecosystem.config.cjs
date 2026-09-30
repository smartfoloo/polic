// pm2: `pm2 start ecosystem.config.cjs`, then `pm2 restart polic` after each build.
// Bound to localhost; Caddy proxies to it.
module.exports = {
	apps: [
		{
			name: 'polic',
			script: 'build/index.js',
			env: { HOST: '127.0.0.1', PORT: 3005 }
		}
	]
};
