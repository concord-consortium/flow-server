//
// A base view
//
var BaseView = function(options) {

    var divId = options.id;

    // console.log("[DEBUG] Creating BaseView", options);

    var ret = {

        _divId: divId,

        getDivId: function() { return this._divId; },

        show: function() {
            // console.log("[DEBUG] Base view show " + this._divId);
            jQuery('#'+this._divId).show();
        },

        hide: function() {
            // console.log("[DEBUG] Base view hide " + this._divId);
            jQuery('#'+this._divId).hide();
        }

    };

    return ret;
}
