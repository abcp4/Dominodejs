var igeClientConfig = {
	include: [
		/* Your custom game JS scripts */
		'./GameClasses/ClientNetworkEvents.js',
		'./GameClasses/DominoGame.js',
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }