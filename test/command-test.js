var sys 	 		= require('sys');
var net		 		= require('net');

var sock = new net.Socket();

var _email = 'test@test.com';
var _pass = '123qwe';

sock.connect(9000, 'localhost', function(){
	console.log('Connected!');
	
	//Connect, then on the callback of the create_login
	//we will try to log in
	sock.write(JSON.stringify({
		command: 'create_login'
		, email: _email
		, password: _pass
	}));
	
});

sock.on('data', function(data){
	
	console.log('Got data: ' + data);
	
	var result = JSON.parse(data);
	
	switch (result.command){
	
		case 'create_login':
			console.log(result.message);
			sock.write(JSON.stringify({
				command: 'login'
				, email: _email
				, password: _pass
			}));
			break;
		case 'login':
			console.log(result.message);

			sock.write(JSON.stringify({
				command: 'update_state'
				, state: JSON.stringify({x: 10, y: 10})
			}));
			
			sock.write(JSON.stringify({command: 'number_of_clients'}));
			
			break;
		case 'state':
			console.log('Got state: ' + result);
			break;
		default:
			console.log(result.message);
	};
	
});