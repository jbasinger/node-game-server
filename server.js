var _					= require('./lib/underscore-min');
var sys 	 		= require('sys');
var net		 		= require('net');
var sqlite 		= require('sqlite');
var crypto 		= require('crypto');
var server_db = require('./server-db');

var GameServer = exports.GameServer = function(){
	
	var gs = this;
	
	this.INVALID_COMMAND = gs.failure('invalid_command', 'Invalid command.');
	
	this.addCommand('create_login', {
			parameters: ['email','password']
		, check: function(obj){ return obj.email && obj.password; }
		, run: function(obj, user, callback){
			
			//Hash up our password
			var password = gs.getPasswordDigest(obj.password);
			
			//Check if the user exists first.
			var sql = 'SELECT * FROM users WHERE email = ?';
			
			gs.db.execute(sql, [obj.email], function(error, rows){
				
				//If we got a row back then we already have this account.
				if (typeof(rows) != 'undefined' && rows.length > 0){
					callback(gs.failure(obj.command, 'Account already exists'));
					return;
				}
				
				//Create the user
				sql = 'INSERT INTO users (email, password) VALUES (?,?)';
				
				gs.db.execute(sql,[obj.email, password], function(error,rows){
					
					console.log('Created account ' + obj.email);
					
					if (error) {
						callback(gs.failure('Error creating account.'));
						return;
					}
					
					callback(gs.success(obj.command, 'Account created successfully.'));
					
				});
				
			});
			
		}
	});
	this.addCommand('login',{
			parameters: ['email','password']
		, check: function(obj){ return obj.email && obj.password; }
		, run: function(obj, user, callback){
			
			var password = gs.getPasswordDigest(obj.password);
			
			var sql = 'SELECT * FROM users WHERE email=? AND password=?';
			
			//TODO: Set some data in with the connection.
			
			gs.db.prepare(sql,function(error, statement){
				
				if (error) callback(gs.failure(obj.command, 'Error authenticating account'));
				statement.bindArray([obj.email, password], function(){
					statement.fetchAll(function(error, rows){
					
						//Got the user info right here.
					
						statement.finalize(function(error){
							console.log(obj.email + ' successful login.');
							callback(gs.success(obj.command, 'Login successful.'));
						});
					});
				});
				
			});
			
		}//End login run
	});
	this.addCommand('update_state',{
			parameters: ['state']
		, check: function(obj){ return obj.state; }
		, run: function(obj, user, callback){
			
			var _state = {
				command: 'update_state'
				, state: JSON.parse(obj.state)
			};
			
			//This basically just sends the state out to every client except the passer
			for(c in _.without(gs.connections, user)){
				gs.connections[c].write(JSON.stringify(_state));
			}
			
			callback(null);
			
		}// End update_state run
	});
	
};

GameServer.prototype = {
  constructor: GameServer,
};

GameServer.prototype.addCommand = function(cmd_name, cmd){
	
	var msg = [];
	
	if (_.isNull(cmd) || _.isUndefined(cmd)){
		msg.push('Command cannot be null.');
	}
	
	if (!_.isArray(cmd.parameters)){
		msg.push('Command must have a list of parameters.');
	}
	
	if (!_.isFunction(cmd.check)){
		msg.push('Command must have a check function.');
	}
	
	if (!_.isFunction(cmd.run)){
		msg.push('Command must have a run function.');
	}
	
	if (this.commands[cmd_name]){
		msg.push('Command already exists.');
	}
	
	if (msg.length > 0){
		throw msg.join('\r\n');
		return;
	}
	
	this.commands[cmd_name] = cmd;
	
};

GameServer.prototype.INVALID_COMMAND = '';
GameServer.prototype.commands = {};

GameServer.prototype.dbFile = 'server.db';
GameServer.prototype.db = new sqlite.Database();

GameServer.prototype.connections = [];
GameServer.prototype.server = null;
GameServer.prototype.port = 9000;
GameServer.prototype.onClientConnect = function(socket){
	
	var gs = this;
	gs.connections.push(socket);
	
};
GameServer.prototype.onClientDisconnect = function(socket){
	
	var gs = this;
	gs.connections.splice(_.indexOf(socket),1);
	console.log('# of connections: ' + gs.connections.length);

};

GameServer.prototype.success = function(_command, _message, _data){
	return this.result(_command, true, _message, _data);
};

GameServer.prototype.failure = function(_command, _message, _data){
	return this.result(_command, false, _message, _data);
};

GameServer.prototype.result = function(_command, _success, _message, _data){
	
	_data = _data || null;
	
	return new Buffer(JSON.stringify({
		command: _command, 
		success: _success, 
		message: _message,
		data: _data
	}));
};

GameServer.prototype.getPasswordDigest = function(_pass){
	return crypto.createHash('sha1').update(_pass).digest('hex');
};

GameServer.prototype.start = function(db_ready_callback, server_ready_callback){
	
	var gs = this;
	
	//Setup the server's database system.
	gs.db.open(gs.dbFile, function(error){
		
		if (error){
			console.log('Server database load failure.');
			throw error;
		}
		
		server_db.prepare_db(gs.db);
		db_ready_callback(gs.db);
		
	});
	
	gs.server = net.createServer(function(c){

		gs.onClientConnect(c);
		console.log('Client connected.');
		
		//Data Event
		c.on('data',function(data){
			
			var cmd;
			
			try{
				cmd = JSON.parse(data);
			} catch (ex) {
				console.log('Illegal json string: ' + data);
				console.log('Exception:\r\n' + ex);
				return;
			}
			
			if (!cmd || !cmd.command) return;
			
			if (!gs.commands[cmd.command]){
				console.log('Invalid command ' + cmd.command);
				c.write(gs.INVALID_COMMAND);
				return;
			}
			
			if(!gs.commands[cmd.command].check(cmd)){
				console.log('Invalid command arguments ' + cmd.command);
				c.write(gs.failure(cmd.command, "Command requires parameters " + gs.commands[cmd.command].parameters.join()));
				return;
			}
			
			gs.commands[cmd.command].run(cmd, c, function(result){
				if (result)
					c.write(result);
			});
			
		});
		
		//Close Event
		c.on('close', function(){
			gs.onClientDisconnect(c);
		});
		
	});
	
	gs.server.listen(gs.port, '0.0.0.0');
	server_ready_callback();
	console.log('Ready to rock on port 9000.');
	
};
