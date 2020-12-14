let PATTERN = /<\$([A-Za-z0-9]+)\$>/g;

// performs string substitution of all `<$…$>` occurrences, based on a key-value
// mapping exported by a configuration file
export async function substitute(str, configPath) {
	let { default: config } = await import(configPath);
	if(config.call) {
		config = await config();
	}

	return str.replace(PATTERN, (match, key) => {
		let value = config[key];
		if(value === undefined) {
			console.error(`missing configuration for \`${key}\``);
			return key;
		}
		return value;
	});
}
