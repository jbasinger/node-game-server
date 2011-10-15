
var sqlite = require('sqlite');

var TableCreator = exports.TableCreator = function(db){
	
	this.db = db;
	
};

TableCreator.prototype.create = function(tableName, columns){
			
	return this._exec_sql(this.create_sql(tableName,columns));
			
};

TableCreator.prototype.drop = function(tableName){
	
	return this._exec_sql(this.drop_sql(tableName));
	
};

TableCreator.prototype.rename = function(tableName, newTableName){

	return this._exec_sql(this.rename_sql(tableName, newTableName));
	
};

TableCreator.prototype.add_columns = function(tableName, columns){
	
	return this._exec_sql(this.add_columns_sql(tableName, columns));
	
};

TableCreator.prototype.create_sql = function(tableName, columns){
	
	var sql = 'CREATE TABLE IF NOT EXISTS ' + tableName + '(';
	var cols = [];
	
	for(c in columns){
		cols.push(c + ' ' + columns[c]);
	}
	
	sql += cols.join(',') + ');';
	
	return sql;
	
};

TableCreator.prototype.drop_sql = function(tableName){
	
	return 'DROP TABLE IF EXISTS ' + tableName + ';';

};

TableCreator.prototype.rename_sql = function(tableName, newTableName){

	return 'ALTER TABLE ' + tableName + ' RENAME TO ' + newTableName;

};

TableCreator.prototype.add_columns_sql = function(tableName, columns){
	
	var sql = '';
	
	for(c in columns){
		sql += 'ALTER TABLE ' + tableName + ' ADD COLUMN ' + c + ' ' + columns[c] + ';';
	}
	
	return sql;
	
};

TableCreator.prototype._exec_sql = function(script){
	
	this.db.executeScript(script, function(error){
		if (error){
			console.log('This sql did not work:\r\n' + script);
			return false;
		}
	});
	
	return true;
	
};
