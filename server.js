var _					= require('./lib/underscore-min');
var sys 	 		= require('sys');
var net		 		= require('net');
var sqlite 		= require('sqlite');
var crypto 		= require('crypto');
var server_db = require('./server-db');

var db = new sqlite.Database();
var connections = [];

//TODO: Figure out how to make these be command modules
//and use underscore to expand the commands object with them.
var commands = {
	
	create_login: {
			parameters: ['email','password']
		, check: function(obj){ return obj.email && obj.password; }
		, run: function(obj, user, callback){
			
			//Hash up our password
			var password = getPasswordDigest(obj.password);
			
			//Check if the user exists first.
			var sql = 'SELECT * FROM users WHERE email = ?';
			
			db.execute(sql, [obj.email], function(error, rows){
				
				//If we got a row back then we already have this account.
				if (typeof(rows) != 'undefined' && rows.length > 0){
					callback(failure(obj.command, 'Account already exists'));
					return;
				}
				
				//Create the user
				sql = 'INSERT INTO users (email, password) VALUES (?,?)';
				
				db.execute(sql,[obj.email, password], function(error,rows){
					
					console.log('Created account ' + obj.email);
					
					if (error) {
						callback(failure('Error creating account.'));
						return;
					}
					
					callback(success(obj.command, 'Account created successfully.'));
					
				});
				
			});
			
		}
	}, // End create_login command
	
	login: {
			parameters: ['email','password']
		, check: function(obj){ return obj.email && obj.password; }
		, run: function(obj, user, callback){
			
			var password = getPasswordDigest(obj.password);
			
			var sql = 'SELECT * FROM users WHERE email=? AND password=?';
			
			//TODO: Set some data in with the connection.
			
			db.prepare(sql,function(error, statement){
				
				if (error) callback(failure(obj.command, 'Error authenticating account'));
				statement.bindArray([obj.email, password], function(){
					statement.fetchAll(function(error, rows){
					
						//Got the user info right here.
					
						statement.finalize(function(error){
							console.log(obj.email + ' successful login.');
							callback(success(obj.command, 'Login successful.'));
						});
					});
				});
				
			});
			
		}//End login run
	}, // End login command
	
	update_state: {
			parameters: ['state']
		, check: function(obj){ return obj.state; }
		, run: function(obj, user, callback){
			
			var _state = {
				command: 'state'
				, state: JSON.parse(obj.state)
			};
			
			//This basically just sends the state out to every client except the passer
			for(c in _.without(connections, user)){
				connections[c].write(JSON.stringify(_state));
			}
			
			callback(success(obj.command, 'Ok.'));
			
		}// End update_state run
	} // End update_state command
	
};

var INVALID_COMMAND = failure('invalid_command', 'Invalid command.');

//Setup the server's database system.
db.open('server.db', function(error){
	
	if (error){
		console.log('Server database load failure.');
		throw error;
	}
	
	server_db.prepare_db(db);
	
});

//Create the server
var server = net.createServer(function(c){
	
	connections.push(c);
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
		
		if (!commands[cmd.command]){
			console.log('Invalid command ' + cmd.command);
			c.write(INVALID_COMMAND);
			return;
		}
		
		if(!commands[cmd.command].check(cmd)){
			console.log('Invalid command arguments ' + cmd.command);
			c.write(failure(cmd.command, "Command requires parameters " + commands[cmd.command].parameters.join()));
			return;
		}
		
		commands[cmd.command].run(cmd, c, function(result){
			c.write(result);
		});
		
	});
	
	//Close Event
	c.on('close', function(){
		
		connections.splice(_.indexOf(c),1);
		console.log('# of connections: ' + connections.length);
		
	});
	
});

server.listen(9000, '0.0.0.0');
console.log('Ready to rock on port 9000.');

//Helper functions
//TODO: These should probably be in some module or something
function success(_command, _message){
	return result(_command, true,_message);
};

function failure(_command, _message){
	return result(_command, false, _message);
};

function result(_command, _success, _message){
	return new Buffer(JSON.stringify({command: _command, success: _success, message: _message}));
};

function getPasswordDigest(_pass){
	return crypto.createHash('sha1').update(_pass).digest('hex');
};