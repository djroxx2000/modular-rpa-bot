// Listen for network events
self.addEventListener('fetch', async (evt) => {
	const req = evt.request;
	console.log(req);
});
