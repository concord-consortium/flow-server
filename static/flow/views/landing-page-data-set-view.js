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

                    var items = response.items;
                    var recording = [];
                    var recorded = [];
                    for(var i = 0; i < items.length; i++) {
                        var item = items[i];
                        // console.log("[DEBUG] Checking metadata", item.metadata);
                        if(item.metadata && item.metadata.recording == true) {
                            recording.push(item);
                        } else {
                            recorded.push(item);
                        }
                    }

                    div.empty();

                    var createDataSetList = function(displayName, list) {

                        if(list.length == 0) {
                            return;
                        }

                        var recordingNow = jQuery('<div>');
                        recordingNow.text(displayName);
                        recordingNow.appendTo(div);

                        //
                        // A wrapper div around the table allows 
                        // "float: right" to align properly without
                        // overlapping the center divider.
                        //
                        var tableWrapper = jQuery('<div>', 
                                    {   id: 'recording-now-table-wrapper', 
                                        css: {  float:      'right',
                                                textAlign:  'center' } } );

                        // console.log("[DEBUG] Creating 'Recording Now' table...");

                        var table = jQuery('<table>');
                                        // , { css: {    margin: '0 auto' } } );

                        var row = [];
                        for(var i = 0; i < list.length; i++) {
                            
                            // console.log("[DEBUG] Creating dataset item", items[i]);

                            var wrapper = jQuery('<div>', 
                                            { css: {    testAlign: 'center',
                                                        padding: '10px' } });

                            var icon = DatasetIcon( {   container:  wrapper,
                                                        item:       list[i]  } );

                            row.push(wrapper);

                            if (i % 2 == 1) {
                                Util.addTableRow(table, row);
                                row = [];
                            }
                        }
                        if (i % 2 == 1) {
                            row.push(jQuery('<div>',
                                            { css: {    width:  '120px',
                                                        height: '120px',
                                                        padding: '10px' } }) );
                            Util.addTableRow(table, row);
                        }

                        tableWrapper.appendTo(div);
                        table.appendTo(tableWrapper);
                    }

                    createDataSetList("Recording Now", recording);
                    createDataSetList("Previously Recorded", recorded);

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
