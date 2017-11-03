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

