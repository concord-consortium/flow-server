//
// A widget that shows available Pis and record button.
//
var PiSelectorPanel = function(options) {

    var container = options.container;

    var panel = jQuery('<div>', { id: 'pi-selector-panel' } );

    var piTable   = jQuery('<table>', { css: { 
                                            width:  '99%',
                                            height: '300px',
                                            border: '1px solid black' } } );

    var piTitle   = jQuery('<div>', { css: {    textAlign: 'center',
                                                paddingTop: '5px'   } });
    piTitle.text('Available Pis');

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
    // AJAX call and handler for listing Pis.
    //
    var loadPis = function(div) {

        // console.log("[DEBUG] loadPrograms loading My Programs...");

        div.empty();
        div.text("Loading My Programs...");

        var url = '/ext/flow/controllers';

        $.ajax({
            url:        url,
            method:     'GET',
            success:    function(data) {
                var response = JSON.parse(data);

                // console.log("[DEBUG] List controllers response", response);

                if(response.success) {
                   
                    div.empty();
                    div.css('width', '200px');

                    var title = jQuery('<div>');
                    title.text("My Programs");
                    title.appendTo(div);

                    // console.log("[DEBUG] loadPrograms Creating My Programs table...");

                    var table = jQuery('<table>', 
                                    { css: {  margin: '0 auto' } } );

                    var files = response.files;
                    var row = [];
                    for(var i = 0; i < files.length; i++) {

                        var wrapper = jQuery('<div>', 
                                        { css: {    testAlign: 'center',
                                                    padding: '10px' } });

                        var icon = ProgramIcon( {   container:  wrapper,
                                                    filename:   files[i] } );

                        row.push(wrapper);

                        if (i % 2 == 1) {
                            Util.addTableRow(table, row);
                            row = [];
                        }
                    }
                    if (i % 2 == 1) {
                        row.push(jQuery('<div>'));
                        Util.addTableRow(table, row);
                    }
                    table.appendTo(div);

                } else {
                    console.log("[ERROR] Error listing programs", response);
                }
            },
            error: function(data) {
                console.log("[ERROR] List programs error", data);
            },
        });
        
    };

}
