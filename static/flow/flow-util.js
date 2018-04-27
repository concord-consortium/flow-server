var Util = {};

Util.diagramValidator = function(diagramName){

  if(diagramName == '') {
    return false;
  }

  if(diagramName == '_temp_') {
    return false;
  }

  var forbidden = ['/', '\\', '*', '?']; // Might be easier to just ensure alphanumeracy?

  var hasForbidden = forbidden.some(function(c){
    return diagramName.indexOf(c) !== -1
  });
  return !hasForbidden;
};


//
//filter invalid characters
//
Util.filterInvalidCharacters = function(str) {
    var res = str.replace(/[<>:"/\|?*']/g, "");
    return res;
}
//
//filter whitespace
//
Util.filterWhiteSpaceCharacters = function(str) {
    var res = str.trim();
    return res;
}

//
// Sort objects that have a "name" property.
//
Util.sortByName = function(a, b) {
    var aName = a.name.toUpperCase();
    var bName = b.name.toUpperCase();
    return ((aName > bName) - (bName > aName));
};
 
//
// Add td elements to a table row
// @param table     The table to add to.
// @param data      An array of elements to add.
//
Util.addTableRow = function(table, data, tdCss) {

    var row = $('<tr>');

    var _tdCss = {}
    if(tdCss) {
        _tdCss = tdCss;
    }

    for(var i = 0; i < data.length; i++) {
        var td = $('<td>', { css: _tdCss } );

        data[i].appendTo(td);
        td.appendTo(row);
    }

    row.appendTo(table);

};

//
// Returns local date and time from a UTC string representation
//
Util.getLocalDateTime = function(d) {
    if(d.indexOf('.') != -1) {
        d = d.split('.')[0];
       }
    var dateStr = d + " UTC";
    // Safari workaround
    var dateStr = dateStr.replace(/-/g, '/');

    var date = new Date(dateStr);

    return [ date.toLocaleDateString(), date.toLocaleTimeString() ];
};

//
// Util to get local browser date from a UTC string representation
//
Util.getLocalDate = function(d) {
    return Util.getLocalDateTime(d)[0];
};

//
// Util to get local browser date from a UTC string representation
//
Util.getLocalTime = function(d) {
    return Util.getLocalDateTime(d)[1];
};


