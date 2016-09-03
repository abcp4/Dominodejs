var ServerNetworkEvents = {
	/**
	 * Is called when the network tells us a new client has connected
	 * to the server. This is the point we can return true to reject
	 * the client connection if we wanted to.
	 * @param data The data object that contains any data sent from the client.
	 * @param clientId The client id of the client that sent the message.
	 * @private
	 */
	_onPlayerConnect: function (socket) {
		// Don't reject the client connection
		return false;
	},

	_onPlayerDisconnect: function (clientId) {
		ige.server.standbyPlayer = ige.server.standbyPlayer.filter(function (id){return id != clientId;});
		
		if (ige.server.players[clientId]) {
			// Remove the player from the game
			var p1 = ige.server.players[clientId].p1;
			var p2 = ige.server.players[clientId].p2;
			
			ige.server.players[p1].game.destroy();

			// Remove the reference to the player entity
			// so that we don't leak memory
			delete ige.server.players[p1];
			if (p2 != 'IA') delete ige.server.players[p2];
			
			if (p1 == clientId && p2 != 'IA') ige.server.standbyPlayer.push(p2);
			else if (p2 == clientId) ige.server.standbyPlayer.push(p1);
		}
	},

	_onPlayerEntity: function (data, clientId) {
		// PvP against another client
		if (data.human){
			// Checks if there's another client waiting for an opponent
			if (ige.server.standbyPlayer[0]){
				var p1 = ige.server.standbyPlayer[0];
				if (!ige.server.players[clientId] && !ige.server.players[p1]){
					// Create the DominoGame entity
					ige.server.players[p1] = ige.server.players[clientId] = {
						game: new DominoGame(p1, clientId)
							.streamMode(1)
							.drawBounds(false)
							.mount(ige.server.mainScene),
						p1: p1,
						p2: clientId
					};
					
					// Send the entitiy id to both clients
					ige.network.send('playerEntity', {
						game: ige.server.players[p1].game.id(),
						p1: true,
						p2: false
						}, p1);
					ige.network.send('playerEntity', {
						game: ige.server.players[clientId].game.id(),
						p1: false,
						p2: true
						}, clientId);
					
					// Remove the client from the queue
					ige.server.standbyPlayer.shift();
				}
			}else{
				// Put the client on queue
				ige.server.standbyPlayer.push(clientId);
			}
		// PvIA
		}else if (data.ia){
			if (!ige.server.players[clientId]) {
				// Create the DominoGameEntity
				ige.server.players[clientId] = {
					game: new DominoGame(clientId)
						.drawBounds(false)
						.streamMode(1)
						.mount(ige.server.foregroundMap),
					p1: clientId,
					p2: 'IA'
				};
			
				// Tell the client to track their player entity
				ige.network.send('playerEntity', {
					game: ige.server.players[clientId].game.id(),
					p1: true,
					p2: false
				}, clientId);
			}
		}
	},
	
	_onPlayPiece: function (data, clientId, requestId){
		var game = ige.server.players[clientId].game;
		var p1 = ige.server.players[clientId].p1;
		var p2 = ige.server.players[clientId].p2;
		
		if ((game.turn_player == 1 && clientId != p1) || (game.turn_player == 2 && clientId != p2)){
			ige.server.log('É a vez do jogador '+game.turn_player+' e Cliente '+clientId+' tentou jogar no turno errado');
			ige.network.response(requestId, {sucess: false});
		}else{
			//if (game.turn_player == 1) ige.server.log('PossibleActions '+game._PossibleActions(1)+' l_end: '+game.l_end+' r_end: '+game.r_end+' pedra: '+game.p1_hand[data.index]+' lado: '+data.side);
			//if (game.turn_player == 2) ige.server.log('PossibleActions '+game._PossibleActions(2)+' l_end: '+game.l_end+' r_end: '+game.r_end+' pedra: '+game.p2_hand[data.index]+' lado: '+data.side);
			
			var t = game._PossibleActions(game.turn_player);
			
			if (t[0][0] == -1){
				data.index = t[0][0];
				data.side = t[0][1];
			}
			
			var res = game._Play(data.index, data.side);
			
			if (game.game_ended) ige.server.log('O jogo acabou');
			
			ige.network.response(requestId, {sucess: res});
		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ServerNetworkEvents; }