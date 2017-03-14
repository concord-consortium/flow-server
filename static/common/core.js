// This JavaScript file contains common user interface functions and utility functions. It is included in every page.
// The createX functions typically take a dictionary of parameters and return a jQuery DOM element.


// create a link (to a URL or function)
function createLink(params) {
	if (params.href) {
		return $('<a>', {href: params.href, html: params.text});
	} else {
		return $('<a>', {href: '#', html: params.text}).click(params.clickData, params.clickFunc);
	}
}


// create a check-box
function createCheckBox(params) {
	return $('<input>', {type: 'checkbox', id: params.id});
}


// returns a FormData object that holds information about a form; pass the data to createForm
function createFormData() {
	var formData = {};
	formData.ids = [];
	formData.labels = [];
	formData.inputElems = [];
	formData.add = function(params) {
		this.ids.push(params.id);
		this.labels.push(params.label || params.id);
		var value = params.value;
		var inputElem = null;
		if (value instanceof jQuery) {// if jquery object, use it as the input element
			inputElem = value;
		} else {// otherwise, create a basic text input
			if (typeof params.value === 'undefined')
				value = ''
			inputElem = createTextInput({id: params.id, value: value});
		}
		this.inputElems.push(inputElem);
	}
	formData.values = function(params) {
		var vals = {};
		for (var i = 0; i < this.ids.length; i++) {
			var id = this.ids[i];
			vals[id] = $('#' + id).val();
		}
		return vals;
	}
	return formData;
}


// create a form; expects a FormData object (created with createFormData) to be passed in as param.data
function createForm(params) {
	var formData = params.data;
	var form = $('<form>', {role: 'form'});
	for (var i = 0; i < formData.labels.length; i++) {
		var div = $('<div>', {class: 'form-group'}).appendTo(form);
		$('<label>', {'for': formData.ids[i], 'html': formData.labels[i]}).appendTo(div);
		formData.inputElems[i].appendTo(div);
		if (params.modifiedFunc) {
			inputElem.change(params.modifiedFunc);
		}
	}
	return form;
}


// create a form in a modal dialog; expects a FormData object (created with createFormData) to be passed in as param.data
function createModalForm(params) {

	// create a modal containing the form
	var modal = createBasicModal('modalForm', params.title);
	modal.appendTo($('body'));
	var form = createForm(params);
	form.appendTo($('#modalForm-body'));

	// on click, send values to server
	$('#modalForm-ok').click(function() {
		$('#modalForm').modal('hide');

		// extract values from form elements
		var formVars = params.data.values();

		// if requested, apply a transformation to the form data
		if (params.dataTransform) {
			formVars = params.dataTransform(formVars);
		}

		// add CSRF token
		formVars.csrf_token = g_csrfToken;

		// prepare a handler for the ajax call; this will call the user's onDone function if no error
		var handler = function(result) {
			if (result && result.status == 'ok') {
				if (params.onDone) {
					params.onDone(result);
				}
			} else {
				alert('error submitting form data');
			}
		}

		// do the AJAX call
		$.ajax({
			url: params.url,
			type: params.method,
			data: formVars,
			success: handler
		});
	});
	$('#modalForm').modal('show');
}


// create a NameValueData object that holds name-value pairs; can be passed into createNameValueView
function createNameValueData() {
	var nvd = {};
	nvd.names = [];
	nvd.values = [];
	nvd.add = function(label, value) {
		this.names.push(label);
		this.values.push(value);
	}
	return nvd;
}


// create list of names and values; expects a NameValueData object (which can be created using createNameValueData)
function createNameValueView(nameValueData) {
	var dl = $('<dl>', {class: 'dl-horizontal'});
	for (var i = 0; i < nameValueData.names.length; i++) {
		$('<dt>', {html: nameValueData.names[i]}).appendTo(dl);
		var value = nameValueData.values[i];
		if (value === '' || value === null || typeof value === 'undefined')
			value = '&nbsp;';
		$('<dd>', {html: value}).appendTo(dl);
	}
	return dl;
}


// create a column used within a TableData object
function createTableColumn(name) {
	var tableColumn = {};
	tableColumn.name = name;
	tableColumn.values = [];
	tableColumn.highlighted = false;
	tableColumn.alignment = 'left';
	tableColumn.sort = null;
	tableColumn.formatter = null;
	return tableColumn;
}


// creates a TableData object containing a list of named columns; used by the createTable function to display a table
function createTableData() {
	var tableData = {};
	tableData.columns = [];
	tableData.columnsByName = {};
	tableData.sortOrder = null;
	tableData.sortColumnIndex = null;

	// add a value to the given column; if column doesn't exist, will create it
	tableData.add = function(columnName, value) {
		var col = this.columnsByName[columnName];
		if (col === undefined) {
			col = createTableColumn(columnName);
			this.columns.push(col);
			this.columnsByName[columnName] = col;
		}
		col.values.push(value);
	};

	// add an entire column of values at once
	tableData.addColumn = function(columnName, values) {
		col = createTableColumn(columnName);
		col.values = values;
		this.columns.push(col);
		this.columnsByName[columnName] = col;
	};

	// get a column by name
	tableData.column = function(columnName) {
		return this.columnsByName[columnName];
	};

	// set the display format for a table column
	tableData.setFormat = function(columnName, format) {
		if (format == 'timestamp') {
			this.columnsByName[columnName].formatter = function(v) {return moment(v).format('YYYY/M/D H:mm:ss.SSS');};
		}
	};

	// sort by a given column index
	tableData.sort = function(columnIndex, caseInsensitive) {
		var column = this.columns[columnIndex];
		var sortValues = [];
		for (var i = 0; i < column.values.length; i++) {
			var val = column.values[i];
			if (val.html) { // if jquery object (e.g.), take contents
				val = val.html();  // fix(later): revisit this
			}
			sortValues.push(val);
		}
		this.sortOrder = sortIndex(sortValues, caseInsensitive);
		if (column.sortDir === -1) {
			column.sortDir = 1;
			this.sortOrder.reverse();
		} else {
			column.sortDir = -1;
		}
		this.sortColumnIndex = columnIndex;
	};

	return tableData;
}


// fills in a table element to display the given TableData object
function updateTableContents(tableElem, tableData) {
	var columns = tableData.columns;
	var colCount = columns.length;
	if (colCount) {
		var rowCount = columns[0].values.length;
		var tr = $('<tr>').appendTo(tableElem);
		for (var j = 0; j < colCount; j++) {
			var column = columns[j];
			var className = 'alignLeft';
			if (column.alignment === 'right')
				className = 'alignRight';
			var th = $('<th>', {class: className});
			var colHead = $('<span>', {html: column.name});
			// fix(later): use bootstrap sort icons (don't show initially, only after first sorting)
			/*$('<span>', {html: ' X'}).appendTo(colHead).click(function() {
				tableData.sort(j);
				updateTableContents(tableElem, tableData);
			});*/
			colHead.appendTo(th);
			th.appendTo(tr);
		}
		for (var i = 0; i < rowCount; i++) {
			var tr = $('<tr>').appendTo(tableElem);
			for (var j = 0; j < colCount; j++) {
				var column = columns[j];
				var row = i;
				if (tableData.sortOrder) {
					row = tableData.sortOrder[i];
				}
				var value = column.values[row];
				if (column.formatter)
					value = column.formatter(value);
				var className = '';
				if (column.highlighted)
					className = 'highlight ';
				if (column.alignment === 'right')
					className += 'alignRight';
				if (value && value['addPopover']) {// fix(clean): use or remove this
					var td = $('<td>', {class: className}).appendTo(tr);
					$('<a>', {href: "javascript:void(0)", html: value['link']}).appendTo(td).popover({
						html: true,
						trigger: 'hover',
						content: $.proxy(function() {return this['popover']}, value), // make copy of value to use in function
					});
				} else {
					if (value instanceof jQuery) {// if jquery object
						var td = $('<td>', {class: className}).appendTo(tr);
						value.appendTo(td);
					} else {// otherwise, assume plain text
						$('<td>', {html: value, class: className}).appendTo(tr);
					}
				}
			}
		}
	}
}


// create a table element to display the given TableData object
function createTable(tableData) {

	// create the element
	var tableElem = $('<table>', {class: 'table'});
	updateTableContents(tableElem, tableData);
	return tableElem;
}


// creates a MenuData object containing a list of menu item labels and callback functions
function createMenuData() {
	var menuData = {};
	menuData.labels = [];
	menuData.functions = [];
	menuData.args = [];
	menuData.add = function(label, func, arg) {
		this.labels.push(label);
		this.functions.push(func);
		this.args.push(arg);
	}
	return menuData;
}


// creates a drop-down menu (using a MenuData object)
// note: requires boostrap.js
function createDropDownMenu(params) {
	var div = $('<span>', {class: 'dropdown'});

	var classes = 'btn btn-default dropdown-toggle';
	var elemType = '<button>';
	if (params.minimal) {// fix(clean): can we remove this case?
		classes = 'dropdown-toggle';
		elemType = '<span>';
	}
	if (params.compact) {
		var classes = 'btn btn-xs dropdown-toggle';
		var elemType = '<button>';
	}

	var button = $(elemType, {
		'class': classes,
		'type': 'button',
		'id': params.id,
		'data-toggle': 'dropdown',
		'aria-expanded': 'true',
		'html': params.label ? params.label + ' ' : ''}).appendTo(div);
	$('<span>', {class: 'caret'}).appendTo(button);

	createDropDownList(params).appendTo(div);
	return div;
}


// creates the <ul> list part of a bootstrap drop-down (using a MenuData object)
function createDropDownList(params) {
	var ul = $('<ul>', {
		'class': 'dropdown-menu',
		'role': 'menu',
		'aria-labelledby': params.id});
	if (params.alignRight) {
		ul.addClass('dropdown-menu-right');
	}
	var menuData = params.menuData;
	for (var i = 0; i < menuData.labels.length; i++) {
		var li = $('<li>', {role: 'presentation'});
		$('<a>', {
			role: 'menuitem',
			tabindex: '-1',
			html: menuData.labels[i]
		}).appendTo(li).click(menuData.args[i], menuData.functions[i]);
		li.appendTo(ul);
	}
	return ul;
}


// creates a model dialog box
function createBasicModal(id, title, params) {
	var outerDiv = $('#' + id);
	if (outerDiv.length) {// fix(later): what if want to change the label?
		console.log('re-use existing modal');
		$('#' + id + '-body').html(''); // clear out old body HTML if re-using
		var okButton = $('#' + id + '-ok');
		okButton.unbind('click'); // fix(clean): rough hack
		if (params && params.okFunc) {
			okButton.click(params.okFunc);
		}
	} else {
		outerDiv = $('<div>', {class: 'modal fade', id: id, tabindex: '-1', role: 'dialog'});
		var dialogDiv = $('<div>', {class: 'modal-dialog'}).appendTo(outerDiv);
		var contentDiv = $('<div>', {class: 'modal-content'}).appendTo(dialogDiv);
		var headerDiv = $('<div>', {class: 'modal-header'}).appendTo(contentDiv);
		var button = $('<button>', {type: "button", class: "close", 'data-dismiss': "modal", 'aria-label': "Close"}).appendTo(headerDiv);
		$('<span>', {'aria-hidden': "true", html: '&times;'}).appendTo(button);
		$('<h4>', {class: "modal-title", html: title}).appendTo(headerDiv);
		var body = $('<div>', {class: 'modal-body', id: id + '-body'}).appendTo(contentDiv);
		if (params && params.longBody) {
			body.addClass('long-modal-body');
		}
		var footerDiv = $('<div>', {class: 'modal-footer'}).appendTo(contentDiv);
		if (params && params.infoOnly) {  // fix(soon): change this to style == 'infoOnly'
			var okButton = $('<button>', {type: "button", class: "btn btn-default", id: id + '-ok', 'data-dismiss': "modal", html: 'Ok'}).appendTo(footerDiv);
		} else if (params && params.style == 'yes/no') {
			$('<button>', {type: "button", class: "btn btn-default", id: id + '-cancel', 'data-dismiss': "modal", html: 'No'}).appendTo(footerDiv);
			var okButton = $('<button>', {type: "button", class: "btn", id: id + '-ok', html: 'Yes'}).appendTo(footerDiv);
		} else {
			$('<button>', {type: "button", class: "btn btn-default", id: id + '-cancel', 'data-dismiss': "modal", html: 'Cancel'}).appendTo(footerDiv);
			var okButton = $('<button>', {type: "button", class: "btn btn-primary", id: id + '-ok', html: 'Proceed'}).appendTo(footerDiv);
		}
		if (params && params.okFunc) {
			okButton.click(params.okFunc);
		}
		console.log('create new modal');
	}
	return outerDiv;
};


// create a form group with a label that can hold form input elements
function createFormGroup(params) {
	var formGroup = $('<div>', {class: "form-group"});
	$('<label>', {for: params.id, class: "control-label", html: params.label + ':'}).appendTo(formGroup);
	return formGroup;
}


// create a basic text input box
function createTextInput(params) {
	var inputAttr = params;
	inputAttr['type'] = 'text';
	if (inputAttr['class']) {// fix(clean): can make more compact
		inputAttr['class'] += ' form-control';
	} else {
		inputAttr['class'] = 'form-control';
	}
	return $('<input>', inputAttr);
}


// create a drop-down selector with a list of values
// params: id, options (list of {id:, name:}), value
function createSelector(params) {
	var selector = $('<select>', {id: params.id, class: 'form-control'});
	if (params.options) {
		addSelectorOptions(selector, params.options, params.value);
	}
	return selector;
}



// add options (list of {id:, name:}) to a selector widget
function addSelectorOptions(selector, options, selectedId) {
	for (var i = 0; i < options.length; i++) {
		var option = options[i];
		var optionElem = $('<option>', {value: option.id, html: option.name});
		if (option.id === selectedId) {
			optionElem.attr('selected', 'selected');
		}
		optionElem.appendTo(selector);
	}
}


// create a drop-down selector with yes and no as options;
// params: id, value
function createYesNoSelector(params) {
	return createSelector({
		id: params.id,
		options: [{'id': 0, 'name': 'No'}, {'id': 1, 'name': 'Yes'}],
		value: params.value,
	});
}


// create a file upload element
function createFileSelector(params) {
	return $('<input>', {id: params['id'], type: 'file', class: 'form-control'});
}


// this is some experimental code using the jQuery-File-Upload plugin
// requirements:
// <link rel="stylesheet" type="text/css" href="/static/css/jquery.fileupload-9.11.2.css">
// <script type="text/javascript" src="/static/js/jfu-9.11.2/jquery.ui.widget.js"></script>
// <script type="text/javascript" src="/static/js/jfu-9.11.2/jquery.iframe-transport.js"></script>
// <script type="text/javascript" src="/static/js/jfu-9.11.2/jquery.fileupload.js"></script>
function createMultiFileSelector(params) {

	// create HTML
	var container = $('<div>');
	var buttonSpan = $('<span>', {class: "btn btn-success fileinput-button"});
	$('<i>', {class: "glyphicon glyphicon-plus"}).appendTo(buttonSpan);
	$('<span>', {html: 'Select files...'}).appendTo(buttonSpan);
	$('<input>', {id: "fileupload", type: "file", name: "files[]", multiple: 1}).appendTo(buttonSpan);
	buttonSpan.appendTo(container);
	var progress = $('<div>', {id: "progress", class: "progress"});
	$('<div>', {class: "progress-bar progress-bar-success"}).appendTo(progress);
	progress.appendTo(container);
	$('<div>', {id: "files", class: "files"}).appendTo(container);

	// configure file upload library
	$('#fileupload').fileupload({
		url: '/api/v1/resources',
		dataType: 'json',
		done: function (e, data) {
			$.each(data.result.files, function (index, file) {
				$('<p/>').text(file.name).appendTo('#files');
			});
		},
		progressall: function (e, data) {
			var progress = parseInt(data.loaded / data.total * 100, 10);
			$('#progress .progress-bar').css(
				'width',
				progress + '%'
			);
		}
	}).prop('disabled', !$.support.fileInput)
		.parent().addClass($.support.fileInput ? undefined : 'disabled');

	return container;
}


/* ======== helper functions ======== */
// (these don't return elements)


// format an iso timestamp string as a friendly timestamp string
function formatTimestamp(isoTimestampStr) {
	if (isoTimestampStr)
		return moment(isoTimestampStr).format('YYYY-M-DD H:mm:ss');
	else
		return '';
}


// display an alert message
function modalAlert(params) {
	console.log('modal-alert');
	var modal = createBasicModal('alert', params.title, {'infoOnly': true, 'okFunc': params.nextFunc});
	modal.appendTo($('body'));
	$('#alert-body').html(params.message);
	$('#alert').modal('show');
}


// display a prompt for user text
function modalPrompt(params) {
	console.log('prompt:' + params.prompt);
	console.log('default:' + params['default']);
	var modal = createBasicModal('prompt', params.title);
	modal.appendTo($('body'));
	var fg = createFormGroup({id: 'promptInput', label: params.prompt}).appendTo($('#prompt-body'));
	createTextInput({id: 'promptInput', value: params['default'] || ''}).appendTo(fg);
	var checkInput = function() {
		fg.removeClass('has-error');
		var value = $('#promptInput').val();

		// If validator fn defined and value fails validation, continue to show the modal
		if (params.validator && !params.validator(value)){
			fg.addClass('has-error');
			return;
		}

		$('#prompt').modal('hide');
		params.resultFunc(value);
	};

	$('#prompt-ok').click(checkInput);
	fg.keypress(function(e){
		fg.removeClass('has-error');
		if (e.keyCode === 13){
			checkInput();
		}
	})
	$('#prompt').modal('show');
}


// display yes/no confirmation dialog
function modalConfirm(params) {
	var modal = createBasicModal('confirm', params.title, {style: 'yes/no'});
	modal.appendTo($('body'));
	$('#confirm-body').html(params.prompt);
	$('#confirm-ok').click(function() {
		$('#confirm').modal('hide');
		if (params.yesFunc) {
			params.yesFunc();
		}
	});
	$('#confirm-cancel').click(function() {  // don't need hide in this case since cancel button has data-dismiss
		if (params.noFunc) {
			params.noFunc();
		}
	});
	$('#confirm').modal('show');
}


// split a camel case name into a string with spaces between words
function splitCamelCase(name) {
	var result = '';
	for (i = 0; i < name.length; i++) {
		var c = name[i];
		if (c !== c.toLowerCase()) {
			result += ' ';
		}
		result += c;
	}
	return result;
}


// convert string to title case
// based on http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
function titleCase(name) {
    return name.replace(/\w\S*/g, function(s) {return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();});
}


// provide a sorting index for an array
function sortIndex(data, caseInsensitive) {
	var dataWithIndex = [];
	var len = data.length;
	for (var i = 0; i < len; i++) {
		var val = data[i];
		if (caseInsensitive)
			val = val.toLowerCase();
		dataWithIndex.push([val, i]);
	}
	dataWithIndex.sort();
	var index = []
	for (var i = 0; i < len; i++) {
		index.push(dataWithIndex[i][1]);
	}
	return index;
}
