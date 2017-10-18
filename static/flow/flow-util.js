var Util = {};

Util.diagramValidator = function(diagramName){

  if(diagramName == '') {
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
 

