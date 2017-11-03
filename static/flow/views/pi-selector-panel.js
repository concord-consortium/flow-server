//
// A widget that shows available Pis and record button.
//
var PiSelectorPanel = function(options) {

    var container   = options.container;
    var editor      = options.editor;

    var _this = this;

    var panel = jQuery('<div>', { id: 'pi-selector-panel',
                                    css: {  width: '200px',
                                            float: 'right' } } );

    var piTable   = jQuery('<table>', { css: { 
                                            width:  '99%',
                                            border: '1px solid lightgrey' } } );

    var piTitleBar = jQuery('<div>', { css: {   position:   'relative',
                                                textAlign:  'center',
                                                height:     '30px' } });

    var piTitle   = jQuery('<div>', { css: {    // position: 'relative',
                                                textAlign: 'center',
                                                paddingTop: '5px'   } });
    piTitle.text('Available Pis');
    piTitleBar.append(piTitle);

    //
    // A panel for refresh and close buttons
    //
    var buttonPanel = $('<div>', { css: {       textAlign:  'center',
                                                position:   'absolute',
                                                float:      'right',
                                                padding:    '0px',
                                                top:        '0px',
                                                right:      '0px'    } });


    var refreshButton = $('<button>', { css: {  textAlign:  'center',
                                                backgroundColor: 'white',
                                                padding:    '2px',
                                                paddingRight: '4px' } });

    refreshButton.html("&#10226;");
    buttonPanel.append(refreshButton);

    var closeButton = $('<button>', { css: {    textAlign:  'center',
                                                backgroundColor: 'white',
                                                padding:        '2px' } });

    closeButton.html("X");
    buttonPanel.append(closeButton);

    piTitleBar.append(buttonPanel);
     
    var piList      = jQuery('<div>', 
                        {   id:    'pi-selector-list',
                            css: {
                                overflowY:  'scroll',
                                width:      '100%',
                                height:     '300px'  } });

    var datasetNameLabel = jQuery('<div>').html('<i>Name Dataset</i>');
    var datasetNameField = jQuery('<input>', {  
                                                id: 'dataset-name-textfield',
                                                type: 'text',
                                                css: {  width: '99%'

                                                        } });

    var recordButton = jQuery('<button>', 
                        {       class: 'color-start-recording-button',
                                css: {
                                    width:      '100%',
                                    padding:    '5px',
                                    left:       '0px',
                                    bottom:     '0px'   }});

    recordButton.text('Start Recording');

    Util.addTableRow(piTable, [piTitleBar], { verticalAlign: 'top' } );
    Util.addTableRow(piTable, [piList]);
    Util.addTableRow(piTable, [datasetNameLabel]);
    Util.addTableRow(piTable, [datasetNameField]);
    Util.addTableRow(piTable, [recordButton], 
                        {   padding: '2px',
                            verticalAlign: 'bottom' } );

    panel.append(piTable);
    panel.hide();
    container.append(panel);


    this.controllers = [];
    this.selectedController = null;

    //
    // Refresh the list of Pis
    //
    refreshButton.click( function() {
        _this.loadPiList();
    });

    //
    // Close button (return to My Data view.)
    //
    closeButton.click( function() {
        $('#pi-selector-panel').hide();
        $('#my-data-panel').show();
    });

    //
    // Handle selection of pi
    //
    this.selectPi = function(index) {
        for(var i = 0; i < this.controllers.length; i++) {
            var div = $('#pi-selector-controller-'+i);
            if(index == i) {
                this.selectedController = this.controllers[i];
                div.addClass('color-connect-to-pi-button');
            } else {
                div.removeClass('color-connect-to-pi-button');
            }
        }
    }

    //
    // AJAX call and handler for listing Pis.
    //
    this.loadPiList = function() {

        // console.log("[DEBUG] loadPiList loading...");

        _this.controllers = [];
        _this.selectedController = null;

        piList.empty();
        piList.text("Loading Pi list...");

        var url = '/ext/flow/controllers';

        $.ajax({
            url:        url,
            method:     'GET',
            success:    function(data) {
                var response = JSON.parse(data);

                console.log("[DEBUG] List controllers response", response);

                if(response.success) {
                   
                    piList.empty();

                    var table = jQuery('<table>', 
                                    { css: {  width: '100%' } } );

                    _this.controllers = response.controllers;
                    controllers.sort(Util.sortByName);

                    console.log("[DEBUG] Creating Pi table...", controllers);

                    //
                    // Create divs for all pi not in recording state.
                    //
                    for(var i = 0; i < _this.controllers.length; i++) {
                        var controller = _this.controllers[i];
                        if(controller.status.recording_interval != null) {
                            continue;
                        }

                        var controllerDiv = 
                            $('<div>', 
                                {   id: 'pi-selector-controller-'+i,
                                    css: {  border: '1px solid lightgrey',
                                            width: '100%',
                                            padding: '5px',
                                            cursor: 'pointer' } } );

                        controllerDiv.text(controllers[i].name);
                        controllerDiv.click(i, function(e) {
                            _this.selectPi(e.data);
                            // alert(e.data); 
                        });
                        Util.addTableRow(table, [controllerDiv] );
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
