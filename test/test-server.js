var server = require('../server.js');

var gs = new server.GameServer();

gs.addCommand('number_of_clients', {
	parameters:[]
	, check: function(obj){return true;}
	, run: function(obj, user, callback){
		callback(gs.success(obj.command, 'Ok.', gs.connections.length));
	}
});

var connect = gs.onClientConnect;
gs.onClientConnect = function(socket){
	connect(socket);
}

gs.start(function(db){console.log('Ok!')},function(){console.log('Ok!')});