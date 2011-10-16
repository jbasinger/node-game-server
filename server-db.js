var db_creator = require('./lib/node-sqlite-creator');

exports.prepare_db = function(db){

	var tblCreator = new db_creator.TableCreator(db);
	
	tblCreator.create('users', {
		user_id: 'INTEGER PRIMARY KEY',
		email: 'TEXT',
		password: 'TEXT'
	});
	
	tblCreator.add_columns('users', {
		nickname: 'TEXT'
	});
	
};

exports.drop_all = function(db){
	
	var tblCreator = new db_creator.TableCreator(db);
	
	tblCreator.drop('users');
	
};