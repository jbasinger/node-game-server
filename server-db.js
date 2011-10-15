var db_creator = require('./db_creator');

exports.prepare_db = function(db){

	var tblCreator = new db_creator.TableCreator(db);
	
	tblCreator.create('users', {
		user_id: 'INTEGER PRIMARY KEY',
		email: 'TEXT',
		password: 'TEXT'
	});
	
};

exports.drop_all = function(db){
	
	var tblCreator = new db_creator.TableCreator(db);
	
	tblCreator.drop('users');
	
};