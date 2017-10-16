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
