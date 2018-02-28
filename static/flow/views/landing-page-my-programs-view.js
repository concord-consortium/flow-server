//
// A view representing a main landing page
// which can display "My Programs", "Recording Now" data
// and "Previously Recorded" data
//
var LandingPageMyProgramsView = function(options) {

    var base = BaseView(options);
   

    //
    // AJAX call and handler for updating "My Programs" div.
    //
    var loadPrograms = function(div) {

        //console.log("[DEBUG] loadPrograms loading My Programs...");

        div.empty();
        div.text("Loading My Programs...");

        var url = '/ext/flow/list_programs';
        var data = { csrf_token: g_csrfToken };

        $.ajax({
            url: url,
            method: 'POST',
            data: data,
            success: function(data) {
                var response = JSON.parse(data);

                // console.log("[DEBUG] List programs", response);

                if(response.success) {
                   
                    div.empty();
                    //div.css('width', '200px');

                    var items = response.items;
                   // var row = [];
                    for(var i = 0; i < items.length; i++) {
                        var btn = createMyProgramBtn ( items[i].name, i );

                        btn.appendTo(div);
                    }


                } else {
                    console.log("[ERROR] Error listing programs", response);
                }
            },
            error: function(data) {
                console.log("[ERROR] List programs error", data);
            },
        });
        
    };
    
    //
    // create a menu item button to load a saved program
    //
    var createMyProgramBtn = function(name, index) {
        var btn;
        var filename = name;
        if(index%2 == 0){
            btn = $('<button>', { text:filename, class: 'diagramMenuEntry menulightgray' } );
        }
        else{
            btn = $('<button>', { text:filename, class: 'diagramMenuEntry menudarkgray' } );
        }
        btn.click(name, function(e) {
            //console.log("[DEBUG] MyProgramBtn click", filename);
            var editor = getTopLevelView('program-editor-view');
            editor.loadProgram({filename: filename});
        });
        return btn;
    }

    base.show = function() {
        var content = jQuery('#'+base.getDivId());
        loadPrograms(content);
    }

    return base;
}
