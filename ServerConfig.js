var config = {
	include: [
		{name: 'ServerNetworkEvents', path: './GameClasses/ServerNetworkEvents'},
		{name: 'DominoGame', path: './GameClasses/DominoGame'}
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }