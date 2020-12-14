let CONFIG = {
	HOST: "http://example.org",
	PORT: 8080
};

export default async () => {
	await wait(1);
	return CONFIG;
};

function wait(delay) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, delay);
	});
}
