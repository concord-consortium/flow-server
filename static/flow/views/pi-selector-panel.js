//
// A widget that shows available Pis and record button.
//
var PiSelectorPanel = function(options) {

    var container   = options.container;
    var editor      = options.editor;

    var _this = this;

    var panel = jQuery('<div>', { id: 'pi-selector-panel' } );

    var piTable   = jQuery('<table>', { css: { 
                                            width:  '99%',
                                            height: '300px',
                                            border: '1px solid lightgrey' } } );

    var piTitle   = jQuery('<div>', { css: {    position: 'relative',
                                                textAlign: 'center',
                                                paddingTop: '5px'   } });
    piTitle.text('Available Pis');

    var refreshButton = $('<button>', { css: {  textAlign:  'center',
                                                position:   'absolute',
                                                padding:    '0px',
                                                top:        '0px',
                                                right:      '0px'    } });

    refreshButton.html("&#128472;");
    piTitle.append(refreshButton);

    var piList      = jQuery('<div>', 
                        {     id:    'pi-selector-list',
                            css: {
                                width:      '100%',
                                height:     '200px'  } });

    var recordButton = jQuery('<button>', 
                        {       class: 'color-start-recording-button',
                                css: {
                                    width:      '100%',
                                    padding:    '5px',
                                    left:       '0px',
                                    bottom:     '0px'   }});

    recordButton.text('Start Recording');

    Util.addTableRow(piTable, [piTitle], { verticalAlign: 'top' } );
    Util.addTableRow(piTable, [piList]);
    Util.addTableRow(piTable, [recordButton], 
                        {   padding: '2px',
                            verticalAlign: 'bottom' } );

    panel.append(piTable);
    panel.hide();
    container.append(panel);

    //
    // Refresh the list of Pis
    //
    refreshButton.click( function() {
        _this.loadPiList();
    });

    //
    // AJAX call and handler for listing Pis.
    //
    this.loadPiList = function() {

        // console.log("[DEBUG] loadPiList loading...");

        piList.empty();
        piList.text("Loading My Programs...");

        var url = '/ext/flow/controllers';

        $.ajax({
            url:        url,
            method:     'GET',
            success:    function(data) {
                var response = JSON.parse(data);

                console.log("[DEBUG] List controllers response", response);

                if(response.success) {
                   
                    piList.empty();

                    console.log("[DEBUG] Creating Pi table...");

                    var table = jQuery('<table>', 
                                    { css: {  margin: '0 auto' } } );

                    var controllers = response.controllers;
                    controllers.sort(Util.sortByName);
                    for(var i = 0; i < controllers.length; i++) {
                        var controller = $('<div>', 
                                            { css: {    padding: '5px',
                                                        cursor: 'pointer' } } );
                        controller.text(controllers[i].name);
                        Util.addTableRow(table, [controller] );
                    }
                    piList.append(table);

                } else {
                    console.log("[ERROR] Error listing controllers", response);
                }
            },
            error: function(data) {
                console.log("[ERROR] List controllers error", data);
            },
        });
        
    };

    return this;
}
