//
// Block palette
//
var ProgramEditorBlockPalette = function(options) {

    var container = options.container;
    var programEditorPanel = options.programEditorPanel;

    var blockPalette = $('<div>', { css: {  backgroundColor: 'white' } } );

    var createSection = function(name, content) {

        var div         = $('<div>', { css: {   width: '100%',
                                                cursor: 'pointer' } } );

        var title = $('<div>', { css: {paddingLeft: '2px' }} ).text(name);
        title.click( function(e) {
            if(content.is(":visible")) {
                content.hide();
            } else {
                content.show();
            }
        });

        div.append(title); 
        div.append(content);

        return div;
    }

    var createSensorBtn = function(name, type) {
        var btn = $('<button>', { css: { width: '100%' } } );
        btn.text(name);
        btn.click( function() {
            programEditorPanel.addDeviceBlock(type);
        });
        return btn;
    };

    var temp        = createSensorBtn("Temperature", "temperature");
    var humidity    = createSensorBtn("Humidity", "humidity");
    var co2         = createSensorBtn("CO2", "CO2");

    var sensorContent = $('<div>');
    sensorContent.append(temp);
    sensorContent.append(humidity);
    sensorContent.append(co2);

    var sensors     = createSection("Sensors", sensorContent);
    blockPalette.append(sensors);

    var filterContent = $('<div>');

    var createFilterBtn = function(type) {
        console.log("[DEBUG] programEditorPanel", programEditorPanel);
        var btn = $('<button>', { text: type, css: { width: '100%' } } );
        btn.click(type, function(e) {
            programEditorPanel.addFilterBlock(e);
        });
        return btn;
    }

    var andButton   = createFilterBtn("and");
    var orButton    = createFilterBtn("or");
    var notButton   = createFilterBtn("not");

    var filterButton = $('<button>', { css: { width: '100%' } } );
    filterButton.text('...');
    filterButton.click( function() {
        programEditorPanel.showFilterBlockSelector();
    });

    filterContent.append(andButton);
    filterContent.append(orButton);
    filterContent.append(notButton);
    filterContent.append(filterButton);

    var filters = createSection("Filters", filterContent);

    blockPalette.append(filters);

    container.append(blockPalette);

}
