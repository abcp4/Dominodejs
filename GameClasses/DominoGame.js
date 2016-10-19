var DominoGame = IgeEntity.extend({
	classId: 'DominoGame',
	
	init: function (){
		var self = this;
		IgeEntity.prototype.init.call(this);
		
		this.pieces = [
			[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
			[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],
			[2,2],[2,3],[2,4],[2,5],[2,6],
			[3,3],[3,4],[3,5],[3,6],
			[4,4],[4,5],[4,6],
			[5,5],[5,6],
			[6,6]
		];
		this.pieces.sort(function(a,b){return 0.5 - Math.random();});
		this.field = [];
		this.l_end = -1;
		this.r_end = -1;
		
		this.p1_hand = [];
		this.p2_hand = [];
		
		for (i = 0; i < 7; i++){
			this._Buy(1);
			this._Buy(2);
		}
		
		this.turn_player = 1;	
		this.game_ended = false;
		this.winner = 'none';
		
		this.p1_wins = 0;
		this.p2_wins = 0;
		this.p1_points = 0;
		this.p2_points = 0;
		
		if (ige.isClient){
			this.DominoTexture = new IgeCellSheet('./Assets/DominoSprite.bmp', 7, 4);
			
			this.DominoTexture.on('loaded', function (){
				self.pieces_obj = [];
				for (i=0;i<14;i++){
					self.pieces_obj[i] = new IgeEntity()
						.texture(self.DominoTexture)
						.cell(i+1)
						.dimensionsFromCell()
						//.streamMode(1)
						.mount(ige.client.mainScene);
					
					self.pieces_obj[i].mouseUp(function (event, control){
						if (this._customId == 'p_hand'){
							if (ige.client.sel_piece != this._customPos){
								ige.client.sel_piece = this._customPos; //seleciona pedra
							}else ige.client.sel_piece = -1; //deseleciona pedra
						}else if (this._customId == 'first'){
							if (ige.client.sel_side != 'f'){
								ige.client.sel_side = 'l'; //seleciona pedra
							}else ige.client.sel_side = 'n'; //deseleciona pedra
						}else if (this._customId == 'l_end'){
							if (ige.client.sel_side != 'f'){
								ige.client.sel_side = 'l'; //seleciona pedra
							}else ige.client.sel_side = 'n'; //deseleciona pedra
						}else if (this._customId == 'r_end'){
							if (ige.client.sel_side != 'f'){
								ige.client.sel_side = 'r'; //seleciona pedra
							}else ige.client.sel_side = 'n'; //deseleciona pedra
						}
						
						ige.client.log('Click! Piece=' + ige.client.sel_piece + ' Side=' +ige.client.sel_side);
						
						if (ige.client.sel_piece > -1 && ige.client.sel_side != 'n'){
							var index = ige.client.sel_piece;
							var side = ige.client.sel_side;
							
							if (side == 'f') side = 'l';
							
							ige.network.request('playPiece',{index: index, side: side}, function (cmd, result){
								if (result.sucess){
									//faz alguma coisa aqui
									ige.client.log('Sucesso de primeira!');
								}else{
									ige.client.log('Errou!');
									if (self.field.length == 1){
										ige.client.log('Só tem uma pedra no campo, tentando no outro lado');
										ige.network.request('playPiece',{index: index, side: 'r'}, function (cmd, result){
											if (result.sucess){
												//faz outra coisa aqui
												self.streamForceUpdate();
												ige.client.log('Sucesso na segunda!');
											}else{
												//Errou de novo
												ige.client.log('Errou de novo');
											}
										});
									}
								}
								ige.client.sel_piece = -1;
								ige.client.sel_side = 'n';
							});
						}
						ige.client.log('Fim! Side='+ige.client.sel_side+' Piece='+ige.client.sel_piece);
						control.stopPropagation();
					});
				}
			}, false, true);
		}
		
		// Define the data sections that will be included in the stream
		this.streamSections(['transform', 'pieces', 'field', 'l_end', 'r_end', 'p1_hand', 'p2_hand',
			'turn_player', 'game_ended', 'winner', 'p1_wins', 'p2_wins', 'p1_points', 'p2_points']);
	},
	
	_Buy: function (player){
		if (player < 1 && player > 2) return false;
		
		var hand;
		if (player == 1) hand = this.p1_hand;
		else if (player == 2) hand = this.p2_hand;
		
		hand.push(this.pieces.shift());
		return true;
	},
	
	_Play: function (index, side){
		if (this.game_ended == true){
			return false;
		}else if (index >= 0){
			var hand;
			if (this.turn_player == 1) hand = this.p1_hand;
			else if (this.turn_player == 2) hand = this.p2_hand;
			
			if (index >= hand.length) return false;
			
			var p = hand[index];
			var i = this.field.length;
			
			if (side == 'f' || this.l_end == -1 || this.r_end == -1){
				side = 'f';
				this.l_end = p[0];
				this.r_end = p[1];
			}else if (side == 'l'){
				if (p[0] != this.l_end && p[1] != this.l_end) return false;
				else{
					if (p[0] == this.l_end) this.l_end = p[1];
					else if (p[1] == this.l_end) this.l_end = p[0];
				}
			}else if (side == 'r'){
				if (p[0] != this.r_end && p[1] != this.r_end) return false;
				else{
					if (p[0] == this.r_end) this.r_end = p[1];
					else if (p[1] == this.r_end) this.r_end = p[0];
				}
			}
			this.field[i] = [p, this.turn_player, side];
			hand.splice(index, 1);
		}
		this.turn_player = 3 - this.turn_player;
		this._End();
		if (this.game_ended) ige.server.log('O jogo acabou');
		return true;
	},
	
	_PossibleActions: function (player){
		var hand;
		if (player == 1) hand = this.p1_hand;
		else if (player == 2) hand = this.p2_hand;
		
		var actions = [];
		
		if (this.l_end == -1 || this.r_end == -1){
			for (i = 0; i < hand.length; i++){
				actions.push([hand[i],i,'f']);
			}
		}else{
			
			for (i=0;i<hand.length;i++){
				
				//this.log('p: '+hand[i]);
				
				if (hand[i][0] == hand[i][1]){
					//this.log('entrou em p[0]==p[1]');
					if (hand[i][0] == this.l_end) actions.push([i,'l']);
					else if (hand[i][0] == this.r_end) actions.push([i,'r']);
					continue;
				}
				
				if (hand[i][0] == this.l_end){
					//this.log(''+hand[i]+' entrou2');
					actions.push([i,'l']);
					if (this.l_end == this.r_end) continue;
				}
				if (hand[i][1] == this.l_end){
					//this.log('entrou3');
					actions.push([i,'l']);
                    if (this.l_end == this.r_end) continue;
				}
				if (hand[i][0] == this.r_end){
					//this.log('entrou4');
					actions.push([i,'r']);
					if (this.l_end == this.r_end) continue;
				}
				if (hand[i][1] == this.r_end){
					//this.log('entrou5');
					actions.push([i,'r']);
					if (this.l_end == this.r_end) continue;
				}
			}
		}
		if (actions.length == 0) actions.push([-1,'pass']);
		return actions;
	},
	
	_End: function (){
		if (this.game_ended == true) return true;
		else{
			if (this.p1_hand.length > 0 && this._PossibleActions(1)[0][0] != -1) return false;
            if (this.p2_hand.length > 0 && this._PossibleActions(2)[0][0] != -1) return false;
		}
		var p1_total = 0;
		var p1_bottom_value = 7;
		var p1_bottom_piece = 13;
		var p2_total = 0;
		var p2_bottom_value = 7;
		var p2_bottom_piece = 13;
		
		for (p in this.p1_hand){
			p1_total += p[0] + p[1];
			if (p[0] < p1_bottom_value) p1_bottom_value = p[0];
			if (p[1] < p1_bottom_value) p1_bottom_value = p[1];
			if ((p[0]+p[1]) < p1_bottom_piece) p1_bottom_piece = p[0] + p[1];
		}
		for (p in this.p2_hand){
			p2_total += p[0] + p[1];
			if (p[0] < p2_bottom_value) p2_bottom_value = p[0];
			if (p[1] < p2_bottom_value) p2_bottom_value = p[1];
			if ((p[0]+p[1]) < p2_bottom_piece) p2_bottom_piece = p[0] + p[1];
		}
		if (p1_total < p2_total){
			this.p1_wins += 1;
			this.winner = 'p1';
		}
		else if (p1_total > p2_total){
			this.p2_wins += 1;
			this.winner = 'p2';
		}
		else if (p1_total == p2_total){
			if (p1_bottom_value < p2_bottom_value){
				this.p1_wins += 1;
				this.winner = 'p1';
			}
			else if (p1_bottom_value > p2_bottom_value){
				this.p2_wins += 1;
				this.winner = 'p2';
			}
			else if (p1_bottom_value == p2_bottom_value){
				if (p1_bottom_piece < p2_bottom_piece){
					this.p1_wins += 1;
					this.winner = 'p1';
				}
                else{
					this.p2_wins += 1;
					this.winner = 'p2';
				}
			}
		}
        this.p1_points = p2_total;
        this.p2_points = p1_total;
        this.game_ended = true;
        return true;
	},
	
	_NewMatch: function (){
		this.pieces = [
			[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
			[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],
			[2,2],[2,3],[2,4],[2,5],[2,6],
			[3,3],[3,4],[3,5],[3,6],
			[4,4],[4,5],[4,6],
			[5,5],[5,6],
			[6,6]
		];
		this.pieces.sort(function(a,b){return 0.5 - Math.random();});
		this.field = [];
		this.l_end = -1;
		this.r_end = -1;
		
        this.p1_hand = [];
		this.p2_hand = [];
		
		for (i = 0; i < 7; i++){
			this._Buy(1,0);
			this._Buy(2,0);
		}
        
		this.turn_player = 1;
		this.game_ended = false;
		this.winner = 'none';
	},
	
	_pieceToCell: function (p){
		return p[0]*7 + p[1] - p[0]*(p[0]+1)/2 + 1;
	},
	
	_SaveState: function (){
		return {
			pieces: this.pieces,
			field: this.field,
			l_end: this.l_end,
			r_end: this.r_end,
			p1_hand: this.p1_hand,
			p2_hand: this.p2_hand,
			turn_player: this.turn_player,
			game_ended: this.game_ended,
			winner: this.winner,
			p1_wins: this.p1_wins,
			p2_wins: this.p2_wins,
			p1_points: this.p1_points,
			p2_points: this.p2_points
		};
	},
	
	_LoadState: function (state){
		pieces = state.pieces;
		field = state.field;
		l_end = state.l_end;
		r_end = state.r_end;
		p1_hand = state.p1_hand;
		p2_hand = state.p2_hand;
		turn_player = state.turn_player;
		game_ended = state.game_ended;
		winner = state.winner;
		p1_wins = state.p1_wins;
		p2_wins = state.p2_wins;
		p1_points = state.p1_points;
		p2_points = state.p2_points;
	},
	
	/**
	 * Override the default IgeEntity class streamSectionData() method
	 * so that we can check for the custom1 section and handle how we deal
	 * with it.
	 * @param {String} sectionId A string identifying the section to
	 * handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent
	 * from the server to the client for this entity.
	 * @return {*}
	 */
	streamSectionData: function (sectionId, data) {
		// Check if the section is one that we are handling
		if (sectionId === 'pieces' || sectionId === 'p1_hand' || sectionId === 'p2_hand'){
			// Check if the server sent us data, if not we are supposed
			// to return the data instead of set it
			if (ige.isClient) {
				if (data){
					var data2 = data.replace(/,/g ,"");
					
					var v = [];
					for (i=0;i<data2.length;i++){
						var v0 = parseInt(data2[i]);
						var v1 = parseInt(data2[i+1]);
						i++;
						v.push( [v0, v1] );
					}
					
					this[sectionId] = v;
				}
			}else return this[sectionId];
		}else if (sectionId === 'field'){
			if (ige.isClient){
				if (data){
					var data2 = data.replace(/,/g ,"");
					
					var v = [];
					for (i=0;i<data2.length;i+=4){
						var v0 = parseInt(data2[i]);
						var v1 = parseInt(data2[i+1]);
						var v3 = parseInt(data2[i+2]);
						var v4 = data2[i+3];
						
						v.push( [[v0, v1], v3, v4] );
					}
					
					this[sectionId] = v;
				}
			}else return this[sectionId];
		}else if (sectionId === 'l_end' || sectionId === 'r_end' || sectionId === 'turn_player' ||
			sectionId === 'p1_wins' || sectionId === 'p2_wins' || sectionId === 'p1_points' || sectionId === 'p2_points'){
			if (ige.isClient){
				if (data){
					this[sectionId] = parseInt(data);
				}
			}else return this[sectionId];
		}else if (sectionId === 'game_ended'){
			if (ige.isClient){
				if (data){
					if (data == 'true') this[sectionId] = true;
					else if (data == 'false') this[sectionId] = false;
				}
			}else return this[sectionId];
		}else if (sectionId === 'winner'){
			if (ige.isClient){
				if (data){
					this[sectionId] = data;
				}
			}else return this[sectionId];
		}else{
			// The section was not one that we handle here, so pass this
			// to the super-class streamSectionData() method - it handles
			// the "transform" section by itself
			return IgeEntity.prototype.streamSectionData.call(this, sectionId, data);
		}
	},
	
	update: function (ctx, tickDelta){
		if (ige.isClient){
			var k = 0; //Contador sobre o vetor de peças
			
			//Descobre qual é a mão do jogador
			if (ige.client.p1){
				p_hand = this.p1_hand;
				o_hand = this.p2_hand;
			}else if (ige.client.p2){
				p_hand = this.p2_hand;
				o_hand = this.p1_hand;
			}
			
			var x = 0;
			var y = 0;
			
			//Desenha a mão do jogador
			for (i = 0; i < p_hand.length; i++){
				x = -25*p_hand.length + 50*i;
				y = 200;
				
				if (ige.client.sel_piece == i) y -= 50;
				
				this.pieces_obj[k]
					.cell(this._pieceToCell(p_hand[i]))
					.translateTo(x, y, 0);
				
				this.pieces_obj[k]._customId = 'p_hand';
				this.pieces_obj[k]._customPos = i;
				
				if (ige.client.sel_piece == i) this.pieces_obj[k].drawBounds(true);
				else this.pieces_obj[k].drawBounds(false);
				
				k++;
			}
			//Desenha a mão do oponente
			for (i = 0; i < o_hand.length; i++){
				this.pieces_obj[k]
					.cell(1)
					.translateTo(-25*o_hand.length + 50*i, -200, 0);
				
				this.pieces_obj[k]._customId = 'o_hand';
				this.pieces_obj[k]._customPos = i;
				
				this.pieces_obj[k].drawBounds(false);
				
				k++;
			}
			
			var last_r = k;
			var last_l = k;
			
			x = y = 0;
			var rz = Math.radians(90);
			
			for (i = 0; i < this.field.length; i++){
				
				if (i>0){
					if (this.field[i][2] == 'r'){
						x = this.pieces_obj[last_r].translate().x() + 103;
						if (this.pieces_obj[last_r].rotate().z() == Math.radians(90)){
							rz = Math.radians(-90);
						}else if (this.pieces_obj[last_r].rotate().z() == Math.radians(-90)){
							rz = Math.radians(90);
						}
					}
					else if (this.field[i][2] == 'l'){
						x = this.pieces_obj[last_l].translate().x() - 103;
						if (this.pieces_obj[last_l].rotate().z() == Math.radians(90)){
							rz = Math.radians(-90);
						}else if (this.pieces_obj[last_l].rotate().z() == Math.radians(-90)){
							rz = Math.radians(90);
						}
					}
				}
				
				this.pieces_obj[k]
					.cell(this._pieceToCell(this.field[i][0]))
					.translateTo(x,y,0)
					.rotateTo(0,0,rz);
				
				if (this.field.length == 1){
					this.pieces_obj[k]._customId = 'first';
					if (ige.client.sel_side == '1') this.pieces_obj[k].drawBounds(true);
					else this.pieces_obj[k].drawBounds(false);
				}else{
					this.pieces_obj[k]._customId = 'field';
					this.pieces_obj[k].drawBounds(false);
					
					if (this.field[i][2] == 'l') last_l = k;
					else if (this.field[i][2] == 'r') last_r = k;
				}	
				
				this.pieces_obj[k]._customPos = i;
				
				ige.client.log('Teste rotate ' + this.pieces_obj[k].rotate().x());
				
				k++;
			}
			if (this.field.length > 1){
				this.pieces_obj[last_l]._customId = 'l_end';
				this.pieces_obj[last_r]._customId = 'r_end';
				if (ige.client.sel_side == 'l') this.pieces_obj[last_l].drawBounds(true);
				else if (ige.client.sel_side == 'r') this.pieces_obj[last_r].drawBounds(true);
			}
		}
		IgeEntity.prototype.update.call(this, ctx, tickDelta);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = DominoGame; }
