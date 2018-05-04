const express = require('express');
const router = express.Router();
const path = require('path');
const sqlite = require("sqlite3");

const LP = require("../lib/libprotection/index.js")

function Example(operation, formatFunc, format, parameters, tagBuilder) {
	return {
		get Operation() { return operation; },
		get FormatFunc() { return formatFunc; },
		get Format() { return format; },
		get Parameters() { return parameters; },
		get TagBuilder() { return tagBuilder; }
	};
}

function FormatResult(successfully, formattedValue){
	return {
		get Successfully() { return successfully; },
		get FormattedValue() { return formattedValue; }
	}
}

function Result(formatResult, operationResult, exception) {
	return {
		get FormatResult() { return formatResult; },
		get OperationResult() { return operationResult; },
		get Exception() { return exception; }
	}
}

const examples = {
	Html: Example(
		"Renders the given HTML markup on the client side.",
		LP.format.bind(null, LP.Html),
		"<a href='{0}' onclick='alert(\"{1}\");return false'>{2}</a>",
		"Default.aspx\r\nHello from embedded JavaScript code!\r\nThis site's home page",
		s => Promise.resolve(s)
	),
	JavaScript: Example(
		"Executes the given JavaScript code on the client side.",
        LP.format.bind(null, LP.JavaScript),
        "operationResult.innerText = '{0}';",
        "Hello from internal JavaScript code!",
        s => Promise.resolve("<script>\r\n" + s + "\r\n</script>")
	),
	Sql: Example(
		"Executes the given SQL query on the sever side and outputs its results.",
        LP.format.bind(null, LP.Sql),
        "SELECT * FROM myTable WHERE id = {0} AND myColumn = '{1}'",
        "1\r\nvalue1",
        sqlRequestTagBuilder)
	
};

//	"start": "node --inspect-brk ./bin/www"
function sqlRequestTagBuilder(request) {
	
	if (!request) { return ""; }

	const db = new sqlite.Database(path.resolve("assets", "Database.sqlite"), sqlite.OPEN_READONLY, (openErr) => {
		if(openErr !== null) return Promise.reject(openErr);
	});
	
	return new Promise((resolve, reject) => {

		db.all(request, (err, rows) => {
			if(err !== null || rows === undefined || rows.forEach === undefined) { reject(err); return; }
			
			let result = "";
			
			rows.forEach( row =>  {
				result = result + "Id: " + row.Id + ", myColumn: \'" + row.myColumn + "\'<br>";
			})
			
			db.close();
			
			resolve(result);
		});
	});
}



function getLowerCasedProperty(obj, key){
	
	if(key in obj){
		return obj[key];
	}
	
	for(let objKey in obj){
		if(objKey.toLowerCase() === key.toLowerCase()){
			return obj[objKey];
		}
	}
	return undefined;
}

async function getResultsFor(example, format, parameters) {
	
	let result;
	try{
		let formatResult = example.FormatFunc(
			format,
			... parameters.replace("\r\n", "\n").replace("\r", "\n").split("\n")
		);

		result = Result(formatResult, await example.TagBuilder(formatResult), null);
	}catch(e){
		result = Result(null, null, e);
	}
	return result;
}

async function rootHandler(req, res) {

	const model = {};

	model.showDisclaimer = (req.cookies.showDisclaimer === undefined || req.cookies.showDisclaimer !== "false");
	res.cookie("showDisclaimer", "false");

	model.ids = Object.keys(examples);
	
	model.id = getLowerCasedProperty(req.query, "id");
	model.id = model.id ? model.id : model.ids[0];

	const currentExample = examples[model.id] ;
	
	if(currentExample === undefined){
		res.render('index', model);
		return;
	}

	model.exampleOperation = currentExample.Operation;
	model.inputsAreDisabled = false;
	
	model.parameters = getLowerCasedProperty(req.query, "Parameters");
	model.parameters = model.parameters ? model.parameters : currentExample.Parameters;

	

	model.format = getLowerCasedProperty(req.query, "Format");
	model.format = (model.format && !model.inputsAreDisabled) ? model.format : currentExample.Format;

	model.result = await getResultsFor(currentExample, model.format, model.parameters);
	
	res.render('index', model);
}


/* GET home page. */
router.get('/', rootHandler);

module.exports = router;
