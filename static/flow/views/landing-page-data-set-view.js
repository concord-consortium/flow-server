//
// A view representing a main landing page
// which can display "My Programs", "Recording Now" data
// and "Previously Recorded" data
//
var LandingPageDataSetView = function(options) {

    var base = BaseView(options);


    //
    // AJAX call and handler for updating "Recording Now" and 
    // "Previously Recorded" div.
    //
    var loadDatasets = function(div) {

        // console.log("[DEBUG] loading recorded data...");

        div.empty();
        div.text("Loading recorded data...");

        var url = '/ext/flow/list_datasets';

        $.ajax({
            url: url,
            method: 'GET',
            // data: data,
            success: function(data) {
                var response = JSON.parse(data);

                // console.log("[DEBUG] List datasets", response);

                if(response.success) {
                   
                    div.empty();
                    // div.css('width', '200px');

                    var recordingNow = jQuery('<div>');
                    recordingNow.text("Recording Now");
                    recordingNow.appendTo(div);

                    //
                    // A wrapper div around the table allows 
                    // "float: right" to align properly without
                    // overlapping the center divider.
                    //
                    var tableWrapper = jQuery('<div>', 
                                { id: 'recording-now-table-wrapper', 
                                    css: { float: 'right' } } );

                    // console.log("[DEBUG] Creating 'Recording Now' table...");

                    var table = jQuery('<table>');
                                    // , { css: {    margin: '0 auto' } } );

                    var items = response.items;
                    var row = [];
                    for(var i = 0; i < items.length; i++) {
                        
                        // console.log("[DEBUG] Creating dataset item", items[i]);

                        var wrapper = jQuery('<div>', 
                                        { css: {    testAlign: 'center',
                                                    padding: '10px' } });

                        var icon = DatasetIcon( {   container:  wrapper,
                                                    item:       items[i]  } );

                        row.push(wrapper);

                        if (i % 2 == 1) {
                            Util.addTableRow(table, row);
                            row = [];
                        }
                    }
                    if (i % 2 == 1) {
                        row.push(jQuery('<div>',
                                        { css: {    width:  '100px',
                                                    height: '100px',
                                                    padding: '10px' } }) );
                        Util.addTableRow(table, row);
                    }

                    tableWrapper.appendTo(div);
                    table.appendTo(tableWrapper);

                } else {
                    console.log("[ERROR] Error listing programs", response);
                }
            },
            error: function(data) {
                console.log("[ERROR] List programs error", data);
            },
        });
        
    };

    base.show = function() {
        var content = jQuery('#'+base.getDivId());
        loadDatasets(content);
    }

    return base;
}
